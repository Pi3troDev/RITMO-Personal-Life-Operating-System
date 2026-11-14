import type { Goal as GoalDto } from '@ritmo/shared';
import type { Db } from '../../core/db';
import { addDays, dateToDay, dayToDate } from '../../core/time';
import type { Goal, Milestone } from '../../generated/prisma/client';
import { accountBalances } from '../finance/balances';

type GoalRow = Goal & { milestones: Milestone[] };

const HISTORY_DAYS = 365;

const latest = (...dates: Array<Date | null | undefined>) =>
  dates.reduce<Date | null>((max, d) => (d && (!max || d > max) ? d : max), null);

/** Progresso de 0 a 100 segundo a estratégia do objetivo. */
export function computeProgress(
  goal: Pick<Goal, 'progressMode' | 'manualProgress'>,
  milestones: Array<Pick<Milestone, 'completedAt'>>,
  metric: { current: number; target: number } | null,
): number {
  let progress = 0;
  if (goal.progressMode === 'manual') progress = goal.manualProgress;
  else if (goal.progressMode === 'milestones') {
    progress =
      milestones.length === 0
        ? 0
        : (milestones.filter((m) => m.completedAt).length / milestones.length) * 100;
  } else if (metric) progress = (metric.current / metric.target) * 100;
  return Math.max(0, Math.min(100, Math.round(progress)));
}

/**
 * Monta os objetivos com tudo que é calculado: métrica atual (saldo da reserva, horas registradas
 * ou check-ins), progresso, tarefas, última atividade e histórico. Com `snapshot`, grava o ponto de
 * hoje no histórico (no máximo um por objetivo por dia).
 */
export async function buildGoalViews(
  db: Db,
  userId: string,
  goals: GoalRow[],
  today: string,
  { snapshot = false } = {},
): Promise<GoalDto[]> {
  if (goals.length === 0) return [];
  const ids = goals.map((g) => g.id);

  const [habits, taskStats, timeStats, balances, history] = await Promise.all([
    db.habit.findMany({
      where: { userId, goalId: { in: ids } },
      select: { id: true, goalId: true },
    }),
    db.task.groupBy({
      by: ['goalId', 'status'],
      where: { userId, goalId: { in: ids } },
      _count: { _all: true },
      _max: { updatedAt: true },
    }),
    db.timeEntry.groupBy({
      by: ['goalId'],
      where: { userId, goalId: { in: ids }, timerState: 'stopped' },
      _sum: { durationSeconds: true },
      _max: { startedAt: true },
    }),
    accountBalances(db, userId),
    db.goalProgressEntry.findMany({
      where: {
        userId,
        goalId: { in: ids },
        date: { gte: dayToDate(addDays(today, -HISTORY_DAYS)) },
      },
      orderBy: { date: 'asc' },
    }),
  ]);

  const habitIdsByGoal = new Map<string, string[]>();
  for (const h of habits) {
    if (!h.goalId) continue;
    habitIdsByGoal.set(h.goalId, [...(habitIdsByGoal.get(h.goalId) ?? []), h.id]);
  }

  const habitIds = habits.map((h) => h.id);
  const checkinStats = habitIds.length
    ? await db.habitCheckin.groupBy({
        by: ['habitId'],
        where: { userId, habitId: { in: habitIds } },
        _count: { _all: true },
        _max: { createdAt: true },
      })
    : [];
  const doneCheckins = habitIds.length
    ? await db.habitCheckin.groupBy({
        by: ['habitId'],
        where: { userId, habitId: { in: habitIds }, status: 'done' },
        _count: { _all: true },
      })
    : [];

  const views: GoalDto[] = [];
  for (const goal of goals) {
    const goalHabits = habitIdsByGoal.get(goal.id) ?? [];
    const tasks = taskStats.filter((t) => t.goalId === goal.id);
    const doneTasks = tasks
      .filter((t) => t.status === 'done')
      .reduce((n, t) => n + t._count._all, 0);
    const allTasks = tasks.reduce((n, t) => n + t._count._all, 0);
    const time = timeStats.find((t) => t.goalId === goal.id);

    let current = goal.metricCurrent;
    let recentAccountActivity: Date | null = null;
    if (goal.metricKind === 'money') {
      if (goal.linkedAccountId) {
        current = Math.max(0, balances.get(goal.linkedAccountId) ?? 0);
        const last = await db.transaction.findFirst({
          where: {
            userId,
            OR: [{ accountId: goal.linkedAccountId }, { toAccountId: goal.linkedAccountId }],
          },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true },
        });
        recentAccountActivity = last?.createdAt ?? null;
      }
    } else if (goal.metricKind === 'hours') {
      current += Math.round(((time?._sum.durationSeconds ?? 0) / 3600) * 100) / 100;
    } else if (goal.metricKind === 'count') {
      current += doneCheckins
        .filter((c) => goalHabits.includes(c.habitId))
        .reduce((n, c) => n + c._count._all, 0);
    }

    const metric =
      goal.metricKind && goal.metricTarget
        ? { kind: goal.metricKind, current, target: goal.metricTarget, unit: goal.metricUnit ?? '' }
        : null;
    const progress = computeProgress(goal, goal.milestones, metric);

    const lastActivity = latest(
      goal.lastActivityAt,
      ...goal.milestones.map((m) => m.completedAt),
      ...tasks.map((t) => t._max.updatedAt),
      time?._max.startedAt,
      ...checkinStats.filter((c) => goalHabits.includes(c.habitId)).map((c) => c._max.createdAt),
      recentAccountActivity,
    );

    const points = history
      .filter((h) => h.goalId === goal.id)
      .map((h) => ({ date: dateToDay(h.date), progress: Math.round(h.progress) }));
    const todayPoint = points.find((p) => p.date === today);
    if (snapshot && goal.status !== 'archived' && todayPoint?.progress !== progress) {
      await db.goalProgressEntry.upsert({
        where: { goalId_date: { goalId: goal.id, date: dayToDate(today) } },
        create: { userId, goalId: goal.id, date: dayToDate(today), progress },
        update: { progress },
      });
    }
    if (todayPoint) todayPoint.progress = progress;
    else points.push({ date: today, progress });

    views.push({
      id: goal.id,
      name: goal.name,
      description: goal.description,
      category: goal.category,
      areaId: goal.areaId,
      status: goal.status,
      startDate: dateToDay(goal.startDate),
      targetDate: goal.targetDate ? dateToDay(goal.targetDate) : null,
      progressMode: goal.progressMode,
      progress,
      metric,
      linkedAccountId: goal.linkedAccountId,
      milestones: [...goal.milestones]
        .sort((a, b) => a.position - b.position)
        .map((m) => ({
          id: m.id,
          title: m.title,
          done: m.completedAt !== null,
          dueDate: m.dueDate ? dateToDay(m.dueDate) : null,
          completedAt: m.completedAt?.toISOString() ?? null,
          position: m.position,
        })),
      habitIds: goalHabits,
      openTaskCount: allTasks - doneTasks,
      doneTaskCount: doneTasks,
      lastActivityAt: lastActivity?.toISOString() ?? null,
      history: points,
      createdAt: goal.createdAt.toISOString(),
    });
  }
  return views;
}
