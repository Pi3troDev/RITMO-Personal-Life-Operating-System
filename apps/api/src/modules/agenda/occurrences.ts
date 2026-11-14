import type { Db } from '../../core/db';
import type { UserClock } from '../../core/ownership';
import { occurrenceDays } from '../../core/recurrence';
import { addDays, localDateOf, localMinutesOf, rangeOfDays, zonedInstant } from '../../core/time';
import type { Event, EventStatus } from '../../generated/prisma/client';

const DAY_MS = 86_400_000;

export interface Occurrence {
  event: Event;
  /** Dia (no fuso do usuário) da ocorrência original — chave das exceções. */
  originalDay: string;
  start: Date;
  end: Date;
  status: EventStatus;
}

/**
 * Ocorrências de compromissos que tocam os dias `from`..`to` (inclusive, no fuso do usuário).
 * Séries recorrentes são expandidas aqui, na leitura: só ocorrências canceladas ou marcadas
 * individualmente viram linha no banco (`EventException`).
 */
export async function loadOccurrences(
  db: Db,
  userId: string,
  user: Pick<UserClock, 'timezone' | 'weekStartsOn'>,
  from: string,
  to: string,
): Promise<Occurrence[]> {
  const range = rangeOfDays(from, to, user.timezone);

  const events = await db.event.findMany({
    where: {
      userId,
      OR: [
        { recurrence: null, start: { lt: range.end }, end: { gt: range.start } },
        { recurrence: { not: null }, start: { lt: range.end } },
      ],
    },
  });

  const recurringIds = events.filter((e) => e.recurrence).map((e) => e.id);
  const exceptions = recurringIds.length
    ? await db.eventException.findMany({
        where: { userId, eventId: { in: recurringIds } },
      })
    : [];
  const exceptionStatus = new Map(
    exceptions.map(
      (x) => [`${x.eventId}:${x.originalDate.toISOString().slice(0, 10)}`, x.status] as const,
    ),
  );

  const out: Occurrence[] = [];
  for (const event of events) {
    const duration = event.end.getTime() - event.start.getTime();

    if (!event.recurrence) {
      out.push({
        event,
        originalDay: localDateOf(event.start, user.timezone),
        start: event.start,
        end: event.end,
        status: event.status,
      });
      continue;
    }

    const firstDay = localDateOf(event.start, user.timezone);
    const minutes = localMinutesOf(event.start, user.timezone);
    const spanDays = Math.ceil(duration / DAY_MS);
    const days = occurrenceDays(
      event.recurrence,
      firstDay,
      addDays(from, -spanDays),
      to,
      user.weekStartsOn,
    );

    for (const day of days) {
      const start = zonedInstant(day, minutes, user.timezone);
      const end = new Date(start.getTime() + duration);
      if (end <= range.start || start >= range.end) continue;
      out.push({
        event,
        originalDay: day,
        start,
        end,
        status:
          exceptionStatus.get(`${event.id}:${day}`) ??
          (event.status === 'cancelled' ? 'cancelled' : 'scheduled'),
      });
    }
  }
  return out;
}
