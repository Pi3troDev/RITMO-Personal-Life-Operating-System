import {
  createManualEntryInputSchema,
  idSchema,
  listTimeEntriesQuerySchema,
  startTimerInputSchema,
  timeEntrySchema,
  updateTimeEntryInputSchema,
  type TimeEntry as TimeEntryDto,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Deps } from '../../core/deps';
import { badRequest, conflict, notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { assertOwned, userClock } from '../../core/ownership';
import { areaForKind } from '../../core/time-ledger';
import { addDays, dateToDay, dayToDate, localDateOf, zonedInstant } from '../../core/time';
import type { EnglishSkill, TimeEntry, TimeEntryKind } from '../../generated/prisma/client';

/** Tempo ativo até `now`: para um cronômetro rodando, soma o trecho corrente. */
export function entrySeconds(
  entry: Pick<TimeEntry, 'durationSeconds' | 'timerState' | 'lastResumedAt'>,
  now: Date,
) {
  const running =
    entry.timerState === 'running' && entry.lastResumedAt
      ? Math.max(0, Math.floor((now.getTime() - entry.lastResumedAt.getTime()) / 1000))
      : 0;
  return entry.durationSeconds + running;
}

export function toTimeEntryDto(entry: TimeEntry, now = clock.now()): TimeEntryDto {
  return {
    id: entry.id,
    kind: entry.kind,
    source: entry.source,
    timerState: entry.timerState,
    title: entry.title,
    notes: entry.notes,
    startedAt: entry.startedAt.toISOString(),
    endedAt: entry.endedAt?.toISOString() ?? null,
    date: dateToDay(entry.localDate),
    durationSeconds: entrySeconds(entry, now),
    areaId: entry.areaId,
    goalId: entry.goalId,
    projectId: entry.projectId,
    taskId: entry.taskId,
    eventId: entry.eventId,
    habitId: entry.habitId,
    studyTrackId: entry.studyTrackId,
    lessonId: entry.lessonId,
    bookId: entry.bookId,
    englishSkill: entry.englishSkill,
  };
}

interface Context {
  kind?: TimeEntryKind;
  title?: string | null;
  notes?: string | null;
  areaId?: string | null;
  goalId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  eventId?: string | null;
  habitId?: string | null;
  studyTrackId?: string | null;
  lessonId?: string | null;
  bookId?: string | null;
  englishSkill?: EnglishSkill | null;
}

export function timeRoutes({ db }: Deps): AnyRoute[] {
  const idParams = z.object({ id: idSchema });

  /** Área, objetivo e projeto são copiados do item de origem, então relatórios são um único GROUP BY. */
  async function resolveContext(userId: string, input: Context) {
    await assertOwned(db, 'area', userId, input.areaId);
    await assertOwned(db, 'goal', userId, input.goalId);
    await assertOwned(db, 'project', userId, input.projectId);

    const result = {
      kind: input.kind,
      title: input.title ?? null,
      notes: input.notes ?? null,
      areaId: input.areaId ?? null,
      goalId: input.goalId ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      eventId: input.eventId ?? null,
      habitId: input.habitId ?? null,
      studyTrackId: input.studyTrackId ?? null,
      lessonId: input.lessonId ?? null,
      bookId: input.bookId ?? null,
      englishSkill: input.englishSkill ?? null,
    };

    if (input.taskId) {
      const task = await db.task.findFirst({ where: { id: input.taskId, userId } });
      if (!task) throw badRequest('Tarefa inválida.');
      result.areaId ??= task.areaId;
      result.goalId ??= task.goalId;
      result.projectId ??= task.projectId;
      result.title ??= task.title;
      result.kind ??= 'task';
    }
    if (input.eventId) {
      const event = await db.event.findFirst({ where: { id: input.eventId, userId } });
      if (!event) throw badRequest('Compromisso inválido.');
      result.areaId ??= event.areaId;
      result.goalId ??= event.goalId;
      result.title ??= event.title;
    }
    if (input.habitId) {
      const habit = await db.habit.findFirst({ where: { id: input.habitId, userId } });
      if (!habit) throw badRequest('Hábito inválido.');
      result.areaId ??= habit.areaId;
      result.goalId ??= habit.goalId;
      result.title ??= habit.name;
    }
    if (input.lessonId) {
      const lesson = await db.lesson.findFirst({ where: { id: input.lessonId, userId } });
      if (!lesson) throw badRequest('Aula inválida.');
      // A aula pertence a uma trilha: o tempo conta para a trilha mesmo que só a aula tenha sido informada.
      result.studyTrackId ??= lesson.trackId;
      result.title ??= lesson.title;
    }
    if (result.studyTrackId) {
      const track = await db.studyTrack.findFirst({ where: { id: result.studyTrackId, userId } });
      if (!track) throw badRequest('Trilha inválida.');
      result.areaId ??= track.areaId;
      result.goalId ??= track.goalId;
      result.title ??= track.name;
      result.kind ??= 'study';
    }
    if (input.bookId) {
      const book = await db.book.findFirst({ where: { id: input.bookId, userId } });
      if (!book) throw badRequest('Livro inválido.');
      result.goalId ??= book.goalId;
      result.title ??= book.title;
      result.kind ??= 'reading';
    }
    if (input.englishSkill) result.kind ??= 'english';
    const kind = result.kind ?? ('other' as TimeEntryKind);
    result.areaId ??= await areaForKind(db, userId, kind);
    return { ...result, kind };
  }

  /** O tempo registrado em uma tarefa alimenta o `spentMinutes` dela. */
  async function adjustTaskSpent(taskId: string | null, deltaMinutes: number) {
    if (!taskId || deltaMinutes === 0) return;
    const task = await db.task.findUnique({
      where: { id: taskId },
      select: { spentMinutes: true },
    });
    if (!task) return;
    await db.task.update({
      where: { id: taskId },
      data: { spentMinutes: Math.max(0, task.spentMinutes + deltaMinutes) },
    });
  }

  async function findEntry(userId: string, id: string) {
    const entry = await db.timeEntry.findFirst({ where: { id, userId } });
    if (!entry) throw notFound();
    return entry;
  }

  return [
    route({
      method: 'get',
      path: '/time-entries',
      tag: 'Tempo',
      summary: 'Listar registros de tempo',
      description: 'Sem `from`/`to`, devolve os últimos 30 dias.',
      query: listTimeEntriesQuerySchema,
      response: z.array(timeEntrySchema),
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        const to = query.to ?? user.today;
        const from = query.from ?? addDays(to, -29);
        const entries = await db.timeEntry.findMany({
          where: {
            userId,
            localDate: { gte: dayToDate(from), lte: dayToDate(to) },
            ...(query.taskId ? { taskId: query.taskId } : {}),
            ...(query.goalId ? { goalId: query.goalId } : {}),
            ...(query.areaId ? { areaId: query.areaId } : {}),
          },
          orderBy: { startedAt: 'desc' },
        });
        const now = clock.now();
        return entries.map((e) => toTimeEntryDto(e, now));
      },
    }),

    route({
      method: 'get',
      path: '/time-entries/active',
      tag: 'Tempo',
      summary: 'Cronômetro ativo',
      description: 'Devolve o cronômetro rodando ou pausado, ou `null`.',
      response: timeEntrySchema.nullable(),
      async handler({ userId }) {
        const entry = await db.timeEntry.findFirst({
          where: { userId, timerState: { in: ['running', 'paused'] } },
          orderBy: { startedAt: 'desc' },
        });
        return entry ? toTimeEntryDto(entry) : null;
      },
    }),

    route({
      method: 'post',
      path: '/time-entries/start',
      tag: 'Tempo',
      summary: 'Iniciar cronômetro',
      description:
        'Só pode haver um cronômetro ativo por vez (409 se já existe). Informar `taskId`, `eventId` ou `habitId` ' +
        'preenche área, objetivo, projeto e título automaticamente.',
      body: startTimerInputSchema,
      response: timeEntrySchema,
      async handler({ userId, body }) {
        const active = await db.timeEntry.count({
          where: { userId, timerState: { in: ['running', 'paused'] } },
        });
        if (active > 0)
          throw conflict('Já existe um cronômetro ativo. Pare-o antes de iniciar outro.');

        const user = await userClock(db, userId);
        const context = await resolveContext(userId, body);
        const now = clock.now();
        const entry = await db.timeEntry.create({
          data: {
            userId,
            ...context,
            source: 'timer',
            timerState: 'running',
            startedAt: now,
            lastResumedAt: now,
            localDate: dayToDate(localDateOf(now, user.timezone)),
          },
        });
        return toTimeEntryDto(entry, now);
      },
    }),

    route({
      method: 'post',
      path: '/time-entries/:id/pause',
      status: 200,
      tag: 'Tempo',
      summary: 'Pausar cronômetro',
      params: idParams,
      response: timeEntrySchema,
      async handler({ userId, params }) {
        const entry = await findEntry(userId, params.id);
        if (entry.timerState !== 'running') throw conflict('Este cronômetro não está rodando.');
        const now = clock.now();
        const updated = await db.timeEntry.update({
          where: { id: entry.id },
          data: {
            durationSeconds: entrySeconds(entry, now),
            timerState: 'paused',
            lastResumedAt: null,
          },
        });
        return toTimeEntryDto(updated, now);
      },
    }),

    route({
      method: 'post',
      path: '/time-entries/:id/resume',
      status: 200,
      tag: 'Tempo',
      summary: 'Retomar cronômetro',
      params: idParams,
      response: timeEntrySchema,
      async handler({ userId, params }) {
        const entry = await findEntry(userId, params.id);
        if (entry.timerState !== 'paused') throw conflict('Este cronômetro não está pausado.');
        const now = clock.now();
        const updated = await db.timeEntry.update({
          where: { id: entry.id },
          data: { timerState: 'running', lastResumedAt: now },
        });
        return toTimeEntryDto(updated, now);
      },
    }),

    route({
      method: 'post',
      path: '/time-entries/:id/stop',
      status: 200,
      tag: 'Tempo',
      summary: 'Parar cronômetro',
      description: 'Fecha o registro e soma o tempo ao `spentMinutes` da tarefa vinculada.',
      params: idParams,
      response: timeEntrySchema,
      async handler({ userId, params }) {
        const entry = await findEntry(userId, params.id);
        if (entry.timerState === 'stopped') throw conflict('Este cronômetro já foi parado.');
        const now = clock.now();
        const seconds = entrySeconds(entry, now);
        const updated = await db.timeEntry.update({
          where: { id: entry.id },
          data: {
            durationSeconds: seconds,
            timerState: 'stopped',
            lastResumedAt: null,
            endedAt: now,
          },
        });
        await adjustTaskSpent(entry.taskId, Math.round(seconds / 60));
        return toTimeEntryDto(updated, now);
      },
    }),

    route({
      method: 'post',
      path: '/time-entries',
      tag: 'Tempo',
      summary: 'Lançar tempo manualmente',
      description: 'Para tempo que já passou. `date` padrão = hoje (no fuso do usuário).',
      body: createManualEntryInputSchema,
      response: timeEntrySchema,
      async handler({ userId, body }) {
        const user = await userClock(db, userId);
        const day = body.date ?? user.today;
        if (day > user.today) throw badRequest('Não é possível lançar tempo em um dia futuro.');

        const context = await resolveContext(userId, body);
        const now = clock.now();
        const startedAt =
          day === user.today
            ? new Date(
                Math.max(
                  now.getTime() - body.minutes * 60_000,
                  zonedInstant(day, 0, user.timezone).getTime(),
                ),
              )
            : zonedInstant(day, 9 * 60, user.timezone);
        const entry = await db.timeEntry.create({
          data: {
            userId,
            ...context,
            source: 'manual',
            timerState: 'stopped',
            startedAt,
            endedAt: new Date(startedAt.getTime() + body.minutes * 60_000),
            durationSeconds: body.minutes * 60,
            localDate: dayToDate(day),
          },
        });
        await adjustTaskSpent(entry.taskId, body.minutes);
        return toTimeEntryDto(entry, now);
      },
    }),

    route({
      method: 'patch',
      path: '/time-entries/:id',
      tag: 'Tempo',
      summary: 'Corrigir registro de tempo',
      description:
        'Só registros já parados. Alterar `minutes` reajusta o tempo da tarefa vinculada.',
      params: idParams,
      body: updateTimeEntryInputSchema,
      response: timeEntrySchema,
      async handler({ userId, params, body }) {
        const entry = await findEntry(userId, params.id);
        if (entry.timerState !== 'stopped')
          throw conflict('Pare o cronômetro antes de editar o registro.');
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        await assertOwned(db, 'project', userId, body.projectId);

        const { minutes, ...rest } = body;
        const updated = await db.timeEntry.update({
          where: { id: entry.id },
          data: {
            ...rest,
            ...(minutes !== undefined
              ? {
                  durationSeconds: minutes * 60,
                  endedAt: new Date(entry.startedAt.getTime() + minutes * 60_000),
                }
              : {}),
          },
        });
        if (minutes !== undefined) {
          await adjustTaskSpent(entry.taskId, minutes - Math.round(entry.durationSeconds / 60));
        }
        return toTimeEntryDto(updated);
      },
    }),

    route({
      method: 'delete',
      path: '/time-entries/:id',
      tag: 'Tempo',
      summary: 'Excluir registro de tempo',
      params: idParams,
      async handler({ userId, params }) {
        const entry = await findEntry(userId, params.id);
        await db.timeEntry.delete({ where: { id: entry.id } });
        if (entry.timerState === 'stopped') {
          await adjustTaskSpent(entry.taskId, -Math.round(entry.durationSeconds / 60));
        }
      },
    }),
  ];
}
