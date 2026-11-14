import type { Insight } from '@ritmo/shared';
import type { Db } from '../../core/db';
import type { UserClock } from '../../core/ownership';
import { addDays, dateToDay, dayToDate, diffDays, localDateOf, weekdayOf } from '../../core/time';
import { buildFinanceOverview } from '../finance/finance.routes';
import { computeReserveProjections } from '../finance/projections';
import { buildGoalViews } from '../goals/goal.views';
import { buildDayOverview } from '../day/day.routes';
import type { CheckinStatus } from '../habits/stats';
import { habitStats } from '../habits/stats';

const STALLED_DAYS = 14;
const MIN_SAMPLE_DAYS = 6;

const brl = (cents: number) =>
  (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function rateBetween(
  weekdays: number[],
  checkins: ReadonlyMap<string, CheckinStatus>,
  createdDay: string,
  from: string,
  to: string,
) {
  let due = 0;
  let done = 0;
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (day < createdDay || !weekdays.includes(weekdayOf(day))) continue;
    const status = checkins.get(day);
    if (status === 'skipped') continue;
    due++;
    if (status === 'done') done++;
  }
  return { due, rate: due === 0 ? 0 : done / due };
}

/**
 * Insights determinísticos: cada regra olha só dados que o usuário registrou, tem um limiar explícito
 * e devolve a evidência numérica. Sem amostra suficiente, a regra não dispara.
 */
export async function computeInsights(db: Db, userId: string, user: UserClock): Promise<Insight[]> {
  const out: Insight[] = [];
  const { today } = user;

  // ---- objetivos --------------------------------------------------------------------------
  const goals = await db.goal.findMany({
    where: { userId, status: 'active' },
    include: { milestones: true },
  });
  const views = await buildGoalViews(db, userId, goals, today);
  const projections = await computeReserveProjections(db, userId, today);

  for (const goal of views) {
    const age = diffDays(today, goal.startDate);
    const last = goal.lastActivityAt
      ? localDateOf(new Date(goal.lastActivityAt), user.timezone)
      : null;
    const idle = last ? diffDays(today, last) : age;
    if (age >= STALLED_DAYS && idle >= STALLED_DAYS) {
      out.push({
        id: `goal_stalled:${goal.id}`,
        kind: 'goal_stalled',
        tone: 'attention',
        title: `“${goal.name}” está parado`,
        message: `Nada ligado a este objetivo se mexeu há ${idle} dias. Vale definir o próximo passo ou pausá-lo.`,
        evidence: { goalId: goal.id, daysWithoutActivity: idle, progress: goal.progress },
        link: '/objetivos',
      });
    }

    if (goal.targetDate) {
      const total = diffDays(goal.targetDate, goal.startDate);
      const left = diffDays(goal.targetDate, today);
      if (total >= 14 && left >= 0 && left <= 45) {
        const expected = Math.round(((total - left) / total) * 100);
        if (goal.progress < expected - 15) {
          out.push({
            id: `goal_deadline_risk:${goal.id}`,
            kind: 'goal_deadline_risk',
            tone: 'attention',
            title: `“${goal.name}” está abaixo do ritmo`,
            message: `Faltam ${left} dias para a data-alvo; o progresso é ${goal.progress}% e o esperado em linha reta seria ${expected}%.`,
            evidence: {
              goalId: goal.id,
              progress: goal.progress,
              expectedProgress: expected,
              daysLeft: left,
            },
            link: '/objetivos',
          });
        }
      }
    }
  }

  for (const p of projections) {
    const goal = views.find((g) => g.id === p.goalId);
    if (!goal?.targetDate || !p.projectedDate || p.balanceCents >= p.targetCents) continue;
    if (p.projectedDate > goal.targetDate) {
      out.push({
        id: `reserve_projection:${p.goalId}`,
        kind: 'reserve_projection',
        tone: 'attention',
        title: `Reserva de “${goal.name}” chega depois da meta`,
        message: `No ritmo atual (${brl(p.monthlyPaceCents)} por mês), a reserva fecha em ${p.projectedDate}, depois de ${goal.targetDate}.`,
        evidence: {
          goalId: p.goalId,
          monthlyPaceCents: p.monthlyPaceCents,
          projectedDate: p.projectedDate,
          targetDate: goal.targetDate,
          balanceCents: p.balanceCents,
          targetCents: p.targetCents,
        },
        link: '/financas',
      });
    }
  }

  // ---- carga do dia -----------------------------------------------------------------------
  for (let offset = 0; offset < 3; offset++) {
    const date = addDays(today, offset);
    const day = await buildDayOverview(db, userId, user, date);
    if (day.summary.plannedMinutes > day.summary.capacityMinutes) {
      out.push({
        id: `day_overloaded:${date}`,
        kind: 'day_overloaded',
        tone: 'attention',
        title:
          offset === 0
            ? 'Hoje está acima da sua capacidade'
            : `${date} está acima da sua capacidade`,
        message: `Há ${Math.round((day.summary.plannedMinutes / 60) * 10) / 10} h planejadas para uma capacidade de ${Math.round((day.summary.capacityMinutes / 60) * 10) / 10} h.`,
        evidence: {
          date,
          plannedMinutes: day.summary.plannedMinutes,
          capacityMinutes: day.summary.capacityMinutes,
        },
        link: '/meu-dia',
      });
    }
  }

  // ---- tarefas atrasadas ------------------------------------------------------------------
  const overdue = await db.task.findMany({
    where: { userId, status: { not: 'done' }, dueDate: { lt: dayToDate(today) } },
    select: { dueDate: true },
    orderBy: { dueDate: 'asc' },
  });
  if (overdue.length >= 5) {
    out.push({
      id: 'overdue_pile',
      kind: 'overdue_pile',
      tone: 'attention',
      title: `${overdue.length} tarefas atrasadas`,
      message:
        'Reagende ou descarte as que perderam o sentido: uma lista de atrasadas grande esconde o que importa hoje.',
      evidence: { count: overdue.length, oldestDueDate: dateToDay(overdue[0]!.dueDate!) },
      link: '/tarefas',
    });
  }

  // ---- hábitos ----------------------------------------------------------------------------
  const habits = await db.habit.findMany({ where: { userId, status: 'active' } });
  if (habits.length > 0) {
    const checkins = await db.habitCheckin.findMany({
      where: {
        userId,
        habitId: { in: habits.map((h) => h.id) },
        date: { gte: dayToDate(addDays(today, -400)) },
      },
      select: { habitId: true, date: true, status: true },
    });
    for (const habit of habits) {
      const map = new Map<string, CheckinStatus>(
        checkins.filter((c) => c.habitId === habit.id).map((c) => [dateToDay(c.date), c.status]),
      );
      const weekdays = (habit.weekdays as number[]) ?? [];
      const createdDay = localDateOf(habit.createdAt, user.timezone);

      const recent = rateBetween(
        weekdays,
        map,
        createdDay,
        addDays(today, -14),
        addDays(today, -1),
      );
      const before = rateBetween(
        weekdays,
        map,
        createdDay,
        addDays(today, -28),
        addDays(today, -15),
      );
      if (
        recent.due >= MIN_SAMPLE_DAYS &&
        before.due >= MIN_SAMPLE_DAYS &&
        before.rate - recent.rate >= 0.3
      ) {
        out.push({
          id: `habit_drop:${habit.id}`,
          kind: 'habit_drop',
          tone: 'attention',
          title: `“${habit.name}” perdeu ritmo`,
          message: `Nas últimas duas semanas você fez ${Math.round(recent.rate * 100)}% dos dias agendados; nas duas anteriores, ${Math.round(before.rate * 100)}%. Talvez o hábito precise de outro horário ou de uma meta menor.`,
          evidence: {
            habitId: habit.id,
            recentRate: Math.round(recent.rate * 100),
            previousRate: Math.round(before.rate * 100),
            recentDays: recent.due,
          },
          link: '/habitos',
        });
      }

      const stats = habitStats({ weekdays, createdDay, checkins: map, today });
      if (stats.currentStreak >= 7) {
        out.push({
          id: `habit_streak:${habit.id}`,
          kind: 'habit_streak',
          tone: 'positive',
          title: `${stats.currentStreak} dias seguidos em “${habit.name}”`,
          message:
            'Constância vem de dias comuns repetidos. Se precisar pular um dia, registre como dia excepcional: a sequência continua.',
          evidence: {
            habitId: habit.id,
            currentStreak: stats.currentStreak,
            bestStreak: stats.bestStreak,
          },
          link: '/habitos',
        });
      }
    }
  }

  // ---- orçamento --------------------------------------------------------------------------
  const finance = await buildFinanceOverview(db, userId, today.slice(0, 7));
  const names = new Map(
    (
      await db.financeCategory.findMany({ where: { userId }, select: { id: true, name: true } })
    ).map((c) => [c.id, c.name] as const),
  );
  for (const budget of finance.budgets) {
    if (budget.limitCents <= 0) continue;
    const used = budget.spentCents / budget.limitCents;
    if (used < 0.9) continue;
    const name = names.get(budget.categoryId) ?? 'Categoria';
    out.push({
      id: `budget_risk:${budget.categoryId}:${budget.month}`,
      kind: 'budget_risk',
      tone: 'attention',
      title: used > 1 ? `Orçamento de ${name} estourou` : `Orçamento de ${name} quase no limite`,
      message: `Você gastou ${brl(budget.spentCents)} de ${brl(budget.limitCents)} planejados neste mês (${Math.round(used * 100)}%).`,
      evidence: {
        categoryId: budget.categoryId,
        spentCents: budget.spentCents,
        limitCents: budget.limitCents,
        percentUsed: Math.round(used * 100),
      },
      link: '/financas',
    });
  }

  return out;
}
