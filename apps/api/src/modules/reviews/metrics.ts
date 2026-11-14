import type { ReviewMetrics } from '@ritmo/shared';
import { clock } from '../../core/clock';
import type { Db } from '../../core/db';
import type { UserClock } from '../../core/ownership';
import {
  dateToDay,
  dayToDate,
  eachDay,
  localDateOf,
  rangeOfDays,
  weekdayOf,
} from '../../core/time';
import { loadOccurrences } from '../agenda/occurrences';
import { buildGoalViews } from '../goals/goal.views';

/**
 * Métricas de um período [start, end] (dias do calendário, inclusive). Servem à revisão semanal/mensal,
 * ao relatório de evolução e aos insights — um único lugar para a conta, então os números sempre batem.
 */
export async function computeMetrics(
  db: Db,
  userId: string,
  user: UserClock,
  start: string,
  end: string,
): Promise<ReviewMetrics> {
  const range = rangeOfDays(start, end, user.timezone);
  const now = clock.now();
  // Só conta o que já aconteceu: o futuro do período ainda não pode ser "não feito".
  const lastCountable = end < user.today ? end : user.today;

  const [
    completed,
    overdueOpen,
    occurrences,
    habits,
    checkins,
    entries,
    areas,
    txs,
    accounts,
    goals,
    reflections,
  ] = await Promise.all([
    db.task.count({ where: { userId, completedAt: { gte: range.start, lt: range.end } } }),
    db.task.count({
      where: {
        userId,
        status: { not: 'done' },
        dueDate: { lte: dayToDate(end), lt: dayToDate(user.today) },
      },
    }),
    loadOccurrences(db, userId, user, start, end),
    db.habit.findMany({ where: { userId, status: { not: 'archived' } } }),
    db.habitCheckin.findMany({
      where: { userId, date: { gte: dayToDate(start), lte: dayToDate(end) } },
    }),
    db.timeEntry.findMany({
      where: {
        userId,
        localDate: { gte: dayToDate(start), lte: dayToDate(end) },
        timerState: 'stopped',
      },
    }),
    db.area.findMany({ where: { userId }, select: { id: true, name: true } }),
    db.transaction.findMany({
      where: { userId, date: { gte: dayToDate(start), lte: dayToDate(end) } },
    }),
    db.account.findMany({ where: { userId }, select: { id: true, isReserved: true } }),
    db.goal.findMany({ where: { userId, status: 'active' }, include: { milestones: true } }),
    db.dailyReflection.findMany({
      where: { userId, date: { gte: dayToDate(start), lte: dayToDate(end) } },
    }),
  ]);

  // Compromisso passado sem marcação conta como cumprido, salvo se cancelado.
  const eventsAttended = occurrences.filter((o) => o.end <= now && o.status !== 'cancelled').length;

  const checkinKey = new Map(
    checkins.map((c) => [`${c.habitId}:${dateToDay(c.date)}`, c.status] as const),
  );
  let expected = 0;
  let done = 0;
  let skipped = 0;
  for (const habit of habits) {
    const weekdays = (habit.weekdays as number[]) ?? [];
    const createdDay = localDateOf(habit.createdAt, user.timezone);
    for (const day of eachDay(start, lastCountable)) {
      if (day < createdDay || !weekdays.includes(weekdayOf(day))) continue;
      const status = checkinKey.get(`${habit.id}:${day}`);
      if (status === 'skipped') skipped++;
      else if (status === 'done') {
        expected++;
        done++;
      } else if (day < user.today) expected++;
    }
  }

  const minutesByArea = new Map<string | null, number>();
  for (const e of entries) {
    minutesByArea.set(e.areaId, (minutesByArea.get(e.areaId) ?? 0) + e.durationSeconds / 60);
  }
  const areaName = new Map(areas.map((a) => [a.id, a.name] as const));
  const trackedByArea = [...minutesByArea.entries()]
    .map(([areaId, minutes]) => ({
      areaId,
      name: areaId ? (areaName.get(areaId) ?? 'Sem área') : 'Sem área',
      minutes: Math.round(minutes),
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const reserved = new Set(accounts.filter((a) => a.isReserved).map((a) => a.id));
  let incomeCents = 0;
  let expenseCents = 0;
  let reservedCents = 0;
  for (const t of txs) {
    if (t.type === 'income') incomeCents += t.amountCents;
    else if (t.type === 'expense') expenseCents += t.amountCents;
    else if (t.toAccountId) {
      // Transferência não é receita nem despesa; só mede o que entrou ou saiu das reservas.
      if (reserved.has(t.toAccountId) && !reserved.has(t.accountId)) reservedCents += t.amountCents;
      else if (reserved.has(t.accountId) && !reserved.has(t.toAccountId))
        reservedCents -= t.amountCents;
    }
  }

  const goalViews = await buildGoalViews(db, userId, goals, user.today);
  const periodStart = range.start;
  const moods: Record<string, number> = {};
  for (const r of reflections) if (r.mood) moods[r.mood] = (moods[r.mood] ?? 0) + 1;

  return {
    tasksCompleted: completed,
    tasksOverdue: overdueOpen,
    eventsAttended,
    habits: { expected, done, skipped, rate: expected === 0 ? null : done / expected },
    trackedMinutes: Math.round(entries.reduce((sum, e) => sum + e.durationSeconds, 0) / 60),
    trackedByArea,
    finance: { incomeCents, expenseCents, reservedCents },
    goals: goalViews.map((g) => ({
      goalId: g.id,
      name: g.name,
      progress: g.progress,
      activeInPeriod: !!g.lastActivityAt && new Date(g.lastActivityAt) >= periodStart,
    })),
    reflections: { count: reflections.length, moods },
  };
}
