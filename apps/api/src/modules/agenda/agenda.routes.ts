import {
  agendaItemSchema,
  agendaQuerySchema,
  createEventInputSchema,
  eventSchema,
  idSchema,
  setOccurrenceInputSchema,
  updateEventInputSchema,
  type AgendaItem,
  type CalendarEvent,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { badRequest, notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { assertOwned, userClock } from '../../core/ownership';
import { isValidRule } from '../../core/recurrence';
import {
  dayToDate,
  isDay,
  localDateOf,
  localMinutesOf,
  rangeOfDays,
  zonedInstant,
} from '../../core/time';
import type { Event } from '../../generated/prisma/client';
import { loadOccurrences } from './occurrences';

const DEFAULT_TASK_MINUTES = 30;

const toEventDto = (e: Event): CalendarEvent => ({
  id: e.id,
  title: e.title,
  description: e.description,
  areaId: e.areaId,
  goalId: e.goalId,
  start: e.start.toISOString(),
  end: e.end.toISOString(),
  allDay: e.allDay,
  location: e.location,
  recurrence: e.recurrence,
  reminderMinutes: e.reminderMinutes,
  status: e.status,
  createdAt: e.createdAt.toISOString(),
});

export function agendaRoutes({ db }: Deps): AnyRoute[] {
  const idParams = z.object({ id: idSchema });

  async function findEvent(userId: string, id: string) {
    const event = await db.event.findFirst({ where: { id, userId } });
    if (!event) throw notFound();
    return event;
  }

  return [
    route({
      method: 'get',
      path: '/agenda',
      tag: 'Agenda',
      summary: 'Agenda de um período',
      description:
        'Junta compromissos (com as séries recorrentes já expandidas) e tarefas que ganharam um bloco de tempo. ' +
        '`conflict` marca blocos com horário sobreposto; compromissos cancelados e dia inteiro não entram na conta.',
      query: agendaQuerySchema,
      response: z.array(agendaItemSchema),
      async handler({ userId, query }) {
        if (query.to < query.from)
          throw badRequest('O fim do período precisa ser depois do início.');
        const user = await userClock(db, userId);
        const range = rangeOfDays(query.from, query.to, user.timezone);
        const items: AgendaItem[] = [];

        for (const o of await loadOccurrences(db, userId, user, query.from, query.to)) {
          items.push({
            id: `event:${o.event.id}:${o.start.toISOString()}`,
            kind: 'event',
            refId: o.event.id,
            title: o.event.title,
            areaId: o.event.areaId,
            start: o.start.toISOString(),
            end: o.end.toISOString(),
            allDay: o.event.allDay,
            status: o.status,
            recurring: !!o.event.recurrence,
            conflict: false,
            recurrence: o.event.recurrence,
            location: o.event.location,
            reminderMinutes: o.event.reminderMinutes,
          });
        }

        const tasks = await db.task.findMany({
          where: { userId, scheduledStart: { gte: range.start, lt: range.end } },
        });
        for (const task of tasks) {
          const start = task.scheduledStart!;
          items.push({
            id: `task:${task.id}:${start.toISOString()}`,
            kind: 'task',
            refId: task.id,
            title: task.title,
            areaId: task.areaId,
            start: start.toISOString(),
            end: new Date(
              start.getTime() + (task.estimateMinutes ?? DEFAULT_TASK_MINUTES) * 60_000,
            ).toISOString(),
            allDay: false,
            status: task.status === 'done' ? 'done' : 'scheduled',
            recurring: false,
            conflict: false,
            recurrence: null,
            location: null,
            reminderMinutes: null,
          });
        }

        const timed = items.filter((i) => i.status !== 'cancelled' && !i.allDay);
        for (let a = 0; a < timed.length; a++) {
          for (let b = a + 1; b < timed.length; b++) {
            const x = timed[a]!;
            const y = timed[b]!;
            if (x.start < y.end && y.start < x.end) {
              x.conflict = true;
              y.conflict = true;
            }
          }
        }
        return items.sort((x, y) => x.start.localeCompare(y.start));
      },
    }),

    route({
      method: 'get',
      path: '/events/:id',
      tag: 'Agenda',
      summary: 'Buscar compromisso',
      params: idParams,
      response: eventSchema,
      async handler({ userId, params }) {
        return toEventDto(await findEvent(userId, params.id));
      },
    }),

    route({
      method: 'post',
      path: '/events',
      tag: 'Agenda',
      summary: 'Criar compromisso',
      description:
        '`recurrence` aceita RRULE (DAILY, WEEKLY com BYDAY, MONTHLY, YEARLY; INTERVAL, COUNT, UNTIL).',
      body: createEventInputSchema,
      response: eventSchema,
      async handler({ userId, body }) {
        if (body.recurrence && !isValidRule(body.recurrence))
          throw badRequest('A regra de recorrência é inválida.');
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        const event = await db.event.create({
          data: {
            userId,
            title: body.title,
            description: body.description ?? null,
            areaId: body.areaId ?? null,
            goalId: body.goalId ?? null,
            start: new Date(body.start),
            end: new Date(body.end),
            allDay: body.allDay ?? false,
            location: body.location ?? null,
            recurrence: body.recurrence ?? null,
            reminderMinutes: body.reminderMinutes ?? null,
          },
        });
        return toEventDto(event);
      },
    }),

    route({
      method: 'patch',
      path: '/events/:id',
      tag: 'Agenda',
      summary: 'Editar compromisso',
      description:
        'Em uma série recorrente, a edição vale para todas as ocorrências: a série mantém o primeiro dia e só ' +
        'o horário (e a duração) muda. Para cancelar uma ocorrência isolada use `PUT /events/{id}/occurrences/{date}`.',
      params: idParams,
      body: updateEventInputSchema,
      response: eventSchema,
      async handler({ userId, params, body }) {
        const current = await findEvent(userId, params.id);
        const user = await userClock(db, userId);
        if (body.recurrence && !isValidRule(body.recurrence))
          throw badRequest('A regra de recorrência é inválida.');
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);

        const recurrence = body.recurrence !== undefined ? body.recurrence : current.recurrence;
        let start = current.start;
        let end = current.end;

        if (body.start || body.end) {
          if (recurrence) {
            const firstDay = localDateOf(current.start, user.timezone);
            const oldDuration = current.end.getTime() - current.start.getTime();
            const startMinutes = body.start
              ? localMinutesOf(new Date(body.start), user.timezone)
              : localMinutesOf(current.start, user.timezone);
            let duration = oldDuration;
            if (body.start && body.end)
              duration = new Date(body.end).getTime() - new Date(body.start).getTime();
            else if (body.end) {
              const endMinutes = localMinutesOf(new Date(body.end), user.timezone);
              duration =
                ((endMinutes - startMinutes + 1440) % 1440 || oldDuration / 60_000) * 60_000;
            }
            start = zonedInstant(firstDay, startMinutes, user.timezone);
            end = new Date(start.getTime() + duration);
          } else {
            if (body.start) start = new Date(body.start);
            if (body.end) end = new Date(body.end);
          }
        }
        if (end <= start) throw badRequest('O término precisa ser depois do início.');

        const { start: _s, end: _e, ...rest } = body;
        const updated = await db.event.update({
          where: { id: current.id },
          data: { ...rest, start, end },
        });
        return toEventDto(updated);
      },
    }),

    route({
      method: 'put',
      path: '/events/:id/occurrences/:date',
      tag: 'Agenda',
      summary: 'Cancelar ou concluir uma ocorrência isolada',
      description:
        'Só vale para compromissos recorrentes. `scheduled` desfaz a exceção e a ocorrência volta ao normal.',
      params: z.object({ id: idSchema, date: z.iso.date() }),
      body: setOccurrenceInputSchema,
      response: eventSchema,
      async handler({ userId, params, body }) {
        const event = await findEvent(userId, params.id);
        if (!event.recurrence) throw badRequest('Este compromisso não se repete.');
        if (!isDay(params.date)) throw badRequest('Data inválida.');

        const originalDate = dayToDate(params.date);
        if (body.status === 'scheduled') {
          await db.eventException.deleteMany({
            where: { eventId: event.id, originalDate, userId },
          });
        } else {
          await db.eventException.upsert({
            where: { eventId_originalDate: { eventId: event.id, originalDate } },
            create: { userId, eventId: event.id, originalDate, status: body.status },
            update: { status: body.status },
          });
        }
        return toEventDto(event);
      },
    }),

    route({
      method: 'delete',
      path: '/events/:id',
      tag: 'Agenda',
      summary: 'Excluir compromisso (ou a série inteira)',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.event.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),
  ];
}
