import { TARGET_METRICS_BY_SCOPE, type TargetMetric, type TargetScope } from '@ritmo/shared';
import type { Db } from '../../core/db';
import { addDays, dayToDate, rangeOfDays, startOfWeek } from '../../core/time';
import type { UserClock } from '../../core/ownership';
import type { TimeEntryKind } from '../../generated/prisma/client';

const KIND_BY_SCOPE: Record<TargetScope, TimeEntryKind> = {
  study: 'study',
  dev: 'dev',
  english: 'english',
  reading: 'reading',
  health: 'workout',
  spiritual: 'spiritual',
};

export const weekOf = (user: Pick<UserClock, 'today' | 'weekStartsOn'>) => {
  const start = startOfWeek(user.today, user.weekStartsOn);
  return { start, end: addDays(start, 6) };
};

/** Quanto já foi feito, nesta semana, na métrica de um módulo. Uma consulta determinística por métrica. */
export async function weeklyValue(
  db: Db,
  userId: string,
  user: UserClock,
  scope: TargetScope,
  metric: TargetMetric,
): Promise<number> {
  const { start, end } = weekOf(user);
  const between = { gte: dayToDate(start), lte: dayToDate(end) };

  switch (metric) {
    case 'time_minutes': {
      const sum = await db.timeEntry.aggregate({
        where: { userId, kind: KIND_BY_SCOPE[scope], timerState: 'stopped', localDate: between },
        _sum: { durationSeconds: true },
      });
      return Math.round((sum._sum.durationSeconds ?? 0) / 60);
    }
    case 'workout_sessions':
      return db.workoutLog.count({ where: { userId, date: between } });
    case 'pages_read': {
      const sum = await db.readingLog.aggregate({
        where: { userId, date: between },
        _sum: { pagesRead: true },
      });
      return sum._sum.pagesRead ?? 0;
    }
    case 'bible_chapters': {
      const rows = await db.bibleReading.findMany({
        where: { userId, date: between },
        select: { chapterFrom: true, chapterTo: true },
      });
      return rows.reduce((n, r) => n + (r.chapterTo - r.chapterFrom + 1), 0);
    }
    case 'vocabulary_items': {
      const range = rangeOfDays(start, end, user.timezone);
      return db.vocabularyItem.count({
        where: { userId, createdAt: { gte: range.start, lt: range.end } },
      });
    }
  }
}

export async function targetFor(db: Db, userId: string, scope: TargetScope) {
  return db.periodicTarget.findUnique({ where: { userId_scope: { userId, scope } } });
}

export const allowedMetrics = (scope: TargetScope) => TARGET_METRICS_BY_SCOPE[scope];
