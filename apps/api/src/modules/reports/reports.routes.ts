import {
  evolutionQuerySchema,
  evolutionSchema,
  timeReportQuerySchema,
  timeReportSchema,
} from '@ritmo/shared';
import type { Deps } from '../../core/deps';
import { badRequest } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { userClock } from '../../core/ownership';
import { addDays, dateToDay, dayToDate, diffDays, startOfWeek } from '../../core/time';
import { computeMetrics } from '../reviews/metrics';

const MAX_RANGE_DAYS = 400;

export function reportsRoutes({ db }: Deps): AnyRoute[] {
  return [
    route({
      method: 'get',
      path: '/reports/time',
      tag: 'Relatórios',
      summary: 'Distribuição do tempo registrado',
      description:
        'Responde "como distribuo meu tempo": soma o tempo dos registros parados no período, agrupado por área, tipo, ' +
        'objetivo, projeto ou dia.',
      query: timeReportQuerySchema,
      response: timeReportSchema,
      async handler({ userId, query }) {
        if (query.to < query.from)
          throw badRequest('O fim do período precisa ser depois do início.');
        if (diffDays(query.to, query.from) > MAX_RANGE_DAYS)
          throw badRequest('O período é longo demais.');

        const entries = await db.timeEntry.findMany({
          where: {
            userId,
            timerState: 'stopped',
            localDate: { gte: dayToDate(query.from), lte: dayToDate(query.to) },
          },
        });

        const keyOf = (e: (typeof entries)[number]): string | null => {
          switch (query.groupBy) {
            case 'area':
              return e.areaId;
            case 'goal':
              return e.goalId;
            case 'project':
              return e.projectId;
            case 'kind':
              return e.kind;
            case 'day':
              return dateToDay(e.localDate);
          }
        };

        const seconds = new Map<string | null, number>();
        for (const e of entries)
          seconds.set(keyOf(e), (seconds.get(keyOf(e)) ?? 0) + e.durationSeconds);

        const ids = [...seconds.keys()].filter((k): k is string => !!k);
        const labels = new Map<string, string>();
        if (query.groupBy === 'area') {
          for (const a of await db.area.findMany({ where: { userId, id: { in: ids } } }))
            labels.set(a.id, a.name);
        } else if (query.groupBy === 'goal') {
          for (const g of await db.goal.findMany({ where: { userId, id: { in: ids } } }))
            labels.set(g.id, g.name);
        } else if (query.groupBy === 'project') {
          for (const p of await db.project.findMany({ where: { userId, id: { in: ids } } }))
            labels.set(p.id, p.name);
        }

        const groups = [...seconds.entries()]
          .map(([key, secs]) => ({
            key,
            id: ['area', 'goal', 'project'].includes(query.groupBy) ? key : null,
            label: key
              ? (labels.get(key) ?? key)
              : query.groupBy === 'area'
                ? 'Sem área'
                : 'Sem vínculo',
            minutes: Math.round(secs / 60),
          }))
          .sort((a, b) =>
            query.groupBy === 'day'
              ? (a.key ?? '').localeCompare(b.key ?? '')
              : b.minutes - a.minutes,
          );

        return {
          from: query.from,
          to: query.to,
          totalMinutes: groups.reduce((sum, g) => sum + g.minutes, 0),
          groups,
        };
      },
    }),

    route({
      method: 'get',
      path: '/reports/evolution',
      tag: 'Relatórios',
      summary: 'Evolução semana a semana',
      description:
        'Tarefas concluídas, tempo registrado, consistência de hábitos, receitas e despesas das últimas `weeks` semanas, ' +
        'da mais antiga para a atual.',
      query: evolutionQuerySchema,
      response: evolutionSchema,
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        const thisWeek = startOfWeek(user.today, user.weekStartsOn);
        const weeks = [];
        for (let i = query.weeks - 1; i >= 0; i--) {
          const start = addDays(thisWeek, -7 * i);
          const m = await computeMetrics(db, userId, user, start, addDays(start, 6));
          weeks.push({
            start,
            tasksCompleted: m.tasksCompleted,
            trackedMinutes: m.trackedMinutes,
            habitRate: m.habits.rate,
            incomeCents: m.finance.incomeCents,
            expenseCents: m.finance.expenseCents,
          });
        }
        return { weeks };
      },
    }),
  ];
}
