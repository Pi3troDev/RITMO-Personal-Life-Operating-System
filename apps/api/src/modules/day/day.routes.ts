import {
  dayOverviewSchema,
  idSchema,
  MAX_DAILY_FOCUS,
  reflectionSchema,
  setFocusInputSchema,
  upsertReflectionInputSchema,
  type DayItem,
  type DayOverview,
  type Reflection,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Db } from '../../core/db';
import type { Deps } from '../../core/deps';
import { badRequest } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { userClock, type UserClock } from '../../core/ownership';
import {
  dateToDay,
  dayRange,
  dayToDate,
  localDateOf,
  localMinutesOf,
  minutesBetween,
  weekdayOf,
  zonedInstant,
} from '../../core/time';
import type { DailyReflection } from '../../generated/prisma/client';
import { loadOccurrences } from '../agenda/occurrences';
import { entrySeconds } from '../time/time.routes';

const toReflectionDto = (r: DailyReflection): Reflection => ({
  date: dateToDay(r.date),
  accomplished: r.accomplished,
  pending: r.pending,
  learned: r.learned,
  improve: r.improve,
  mood: r.mood,
  updatedAt: r.updatedAt.toISOString(),
});

/** A visão do dia: compromissos, tarefas e hábitos numa única lista, com o resumo de carga × capacidade. */
export async function buildDayOverview(
  db: Db,
  userId: string,
  user: UserClock,
  date: string,
): Promise<DayOverview> {
  const range = dayRange(date, user.timezone);
  const [occurrences, tasks, habits, checkins, focus, reflection, entries, activeGoals] =
    await Promise.all([
      loadOccurrences(db, userId, user, date, date),
      db.task.findMany({
        where: {
          userId,
          OR: [
            { scheduledStart: { gte: range.start, lt: range.end } },
            { dueDate: dayToDate(date) },
            { dueDate: { lt: dayToDate(date) }, status: { not: 'done' } },
          ],
        },
      }),
      db.habit.findMany({ where: { userId, status: 'active' } }),
      db.habitCheckin.findMany({ where: { userId, date: dayToDate(date) } }),
      db.dailyFocusItem.findMany({
        where: { userId, date: dayToDate(date) },
        orderBy: { position: 'asc' },
      }),
      db.dailyReflection.findUnique({ where: { userId_date: { userId, date: dayToDate(date) } } }),
      db.timeEntry.findMany({ where: { userId, localDate: dayToDate(date) } }),
      db.goal.count({ where: { userId, status: 'active' } }),
    ]);

  const focusIds = focus.map((f) => f.taskId);
  const items: DayItem[] = [];

  for (const o of occurrences) {
    items.push({
      id: `event:${o.event.id}`,
      kind: 'event',
      refId: o.event.id,
      title: o.event.title,
      areaId: o.event.areaId,
      goalId: o.event.goalId,
      start: o.start.toISOString(),
      durationMinutes: Math.max(1, minutesBetween(o.start, o.end)),
      status: o.status === 'done' ? 'done' : o.status === 'cancelled' ? 'skipped' : 'pending',
      priority: null,
      isFocus: false,
      overdue: false,
    });
  }

  for (const t of tasks) {
    const overdue = !!t.dueDate && dateToDay(t.dueDate) < date && t.status !== 'done';
    // Tarefa concluída que só aparecia por estar atrasada não pertence a este dia.
    if (t.status === 'done' && t.dueDate && dateToDay(t.dueDate) < date && !t.scheduledStart)
      continue;
    items.push({
      id: `task:${t.id}`,
      kind: 'task',
      refId: t.id,
      title: t.title,
      areaId: t.areaId,
      goalId: t.goalId,
      start:
        t.scheduledStart && localDateOf(t.scheduledStart, user.timezone) === date
          ? t.scheduledStart.toISOString()
          : null,
      durationMinutes: t.estimateMinutes,
      status: t.status === 'done' ? 'done' : 'pending',
      priority: t.priority,
      isFocus: focusIds.includes(t.id),
      overdue,
    });
  }

  const checkinByHabit = new Map(checkins.map((c) => [c.habitId, c.status] as const));
  const weekday = weekdayOf(date);
  for (const h of habits) {
    const weekdays = (h.weekdays as number[]) ?? [];
    if (!weekdays.includes(weekday)) continue;
    const status = checkinByHabit.get(h.id);
    items.push({
      id: `habit:${h.id}`,
      kind: 'habit',
      refId: h.id,
      title: h.name,
      areaId: h.areaId,
      goalId: h.goalId,
      start: h.suggestedTime
        ? zonedInstant(
            date,
            Number(h.suggestedTime.slice(0, 2)) * 60 + Number(h.suggestedTime.slice(3, 5)),
            user.timezone,
          ).toISOString()
        : null,
      durationMinutes:
        h.targetType === 'duration' && h.targetValue ? Math.round(h.targetValue) : null,
      status: status === 'done' ? 'done' : status === 'skipped' ? 'skipped' : 'pending',
      priority: null,
      isFocus: false,
      overdue: false,
    });
  }

  items.sort((a, b) => {
    if (a.start && b.start) return a.start.localeCompare(b.start);
    if (a.start) return -1;
    if (b.start) return 1;
    return a.title.localeCompare(b.title);
  });

  const countable = items.filter((i) => i.status !== 'skipped');
  const taskItems = items.filter((i) => i.kind === 'task');
  const habitItems = items.filter((i) => i.kind === 'habit');
  const now = clock.now();

  return {
    date,
    focusTaskIds: focusIds,
    items,
    summary: {
      eventsCount: items.filter((i) => i.kind === 'event').length,
      tasksPending: taskItems.filter((i) => i.status === 'pending').length,
      tasksDone: taskItems.filter((i) => i.status === 'done').length,
      habitsScheduled: habitItems.length,
      habitsDone: habitItems.filter((i) => i.status === 'done').length,
      activeGoals,
      plannedMinutes: items.reduce(
        (sum, i) => sum + (i.status === 'skipped' ? 0 : (i.durationMinutes ?? 0)),
        0,
      ),
      spentMinutes: Math.round(entries.reduce((sum, e) => sum + entrySeconds(e, now), 0) / 60),
      capacityMinutes: user.dailyCapacityMinutes,
      completionRate:
        countable.length === 0
          ? 0
          : countable.filter((i) => i.status === 'done').length / countable.length,
    },
    reflection: reflection ? toReflectionDto(reflection) : null,
  };
}

export function dayRoutes({ db }: Deps): AnyRoute[] {
  const dateParams = z.object({ date: z.iso.date() });

  return [
    route({
      method: 'get',
      path: '/day',
      tag: 'Meu Dia',
      summary: 'Visão do dia',
      description:
        'Compromissos, tarefas (do dia e atrasadas) e hábitos agendados, ordenados por horário, mais o resumo ' +
        'de carga planejada × capacidade. `date` padrão = hoje no fuso do usuário.',
      query: z.object({ date: z.iso.date().optional() }),
      response: dayOverviewSchema,
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        return buildDayOverview(db, userId, user, query.date ?? user.today);
      },
    }),

    route({
      method: 'put',
      path: '/day/:date/focus',
      tag: 'Meu Dia',
      summary: 'Definir o foco do dia',
      description: `Até ${MAX_DAILY_FOCUS} tarefas prioritárias. Substitui a seleção anterior.`,
      params: dateParams,
      body: setFocusInputSchema,
      response: dayOverviewSchema,
      async handler({ userId, params, body }) {
        const ids = [...new Set(body.taskIds)];
        const owned = await db.task.count({ where: { userId, id: { in: ids } } });
        if (owned !== ids.length) throw badRequest('Uma das tarefas escolhidas não existe.');

        await db.$transaction([
          db.dailyFocusItem.deleteMany({ where: { userId, date: dayToDate(params.date) } }),
          db.dailyFocusItem.createMany({
            data: ids.map((taskId, position) => ({
              userId,
              taskId,
              position,
              date: dayToDate(params.date),
            })),
          }),
        ]);
        const user = await userClock(db, userId);
        return buildDayOverview(db, userId, user, params.date);
      },
    }),

    route({
      method: 'put',
      path: '/day/:date/reflection',
      tag: 'Meu Dia',
      summary: 'Salvar a reflexão do dia',
      description:
        'Cinco perguntas: o que fiz, o que ficou pendente, o que aprendi, o que melhorar e como foi o dia.',
      params: dateParams,
      body: upsertReflectionInputSchema,
      response: reflectionSchema,
      async handler({ userId, params, body }) {
        const user = await userClock(db, userId);
        if (params.date > user.today)
          throw badRequest('Não é possível refletir sobre um dia futuro.');
        const date = dayToDate(params.date);
        const saved = await db.dailyReflection.upsert({
          where: { userId_date: { userId, date } },
          create: { userId, date, ...body },
          update: body,
        });
        return toReflectionDto(saved);
      },
    }),

    route({
      method: 'get',
      path: '/reflections',
      tag: 'Meu Dia',
      summary: 'Histórico de reflexões',
      query: z.object({
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
        limit: z.coerce.number().int().min(1).max(366).default(60),
      }),
      response: z.array(reflectionSchema),
      async handler({ userId, query }) {
        const rows = await db.dailyReflection.findMany({
          where: {
            userId,
            ...(query.from || query.to
              ? {
                  date: {
                    ...(query.from ? { gte: dayToDate(query.from) } : {}),
                    ...(query.to ? { lte: dayToDate(query.to) } : {}),
                  },
                }
              : {}),
          },
          orderBy: { date: 'desc' },
          take: query.limit,
        });
        return rows.map(toReflectionDto);
      },
    }),

    route({
      method: 'post',
      path: '/day/:date/reschedule',
      tag: 'Meu Dia',
      summary: 'Reagendar o que ficou pendente',
      description:
        'Move tarefas abertas do dia (e as atrasadas) para outra data em um gesto: o prazo vira `toDate` e o bloco de ' +
        'horário, se houver, mantém a hora. Sem `taskIds`, move todas as abertas.',
      params: dateParams,
      body: z.object({ toDate: z.iso.date(), taskIds: z.array(idSchema).optional() }),
      response: z.object({ moved: z.number().int() }),
      status: 200,
      async handler({ userId, params, body }) {
        const user = await userClock(db, userId);
        if (body.toDate <= params.date) throw badRequest('Escolha uma data depois do dia atual.');
        const range = dayRange(params.date, user.timezone);

        const tasks = await db.task.findMany({
          where: {
            userId,
            status: { not: 'done' },
            ...(body.taskIds ? { id: { in: body.taskIds } } : {}),
            OR: [
              { scheduledStart: { gte: range.start, lt: range.end } },
              { dueDate: dayToDate(params.date) },
              { dueDate: { lt: dayToDate(params.date) } },
            ],
          },
        });
        await db.$transaction(
          tasks.map((t) =>
            db.task.update({
              where: { id: t.id },
              data: {
                dueDate: dayToDate(body.toDate),
                ...(t.scheduledStart
                  ? {
                      scheduledStart: zonedInstant(
                        body.toDate,
                        localMinutesOf(t.scheduledStart, user.timezone),
                        user.timezone,
                      ),
                    }
                  : {}),
              },
            }),
          ),
        );
        return { moved: tasks.length };
      },
    }),
  ];
}
