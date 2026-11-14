import {
  createWorkoutLogInputSchema,
  createWorkoutPlanInputSchema,
  dateSchema,
  idSchema,
  updateWorkoutLogInputSchema,
  updateWorkoutPlanInputSchema,
  workoutFrequencySchema,
  workoutLogSchema,
  workoutPlanSchema,
  workoutTypeSchema,
  type PlanExercise,
  type WorkoutLog as LogDto,
  type WorkoutPlan as PlanDto,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { badRequest, notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { userClock } from '../../core/ownership';
import { addDays, dateToDay, dayToDate, startOfWeek } from '../../core/time';
import { dropTimeEntry, syncTimeEntry } from '../../core/time-ledger';
import type { WorkoutLog, WorkoutPlan } from '../../generated/prisma/client';
import { targetFor } from '../targets/progress';

const TYPE_LABEL = {
  strength: 'Treino de força',
  walk: 'Caminhada',
  cardio: 'Cardio',
  other: 'Atividade física',
} as const;

const toPlanDto = (p: WorkoutPlan): PlanDto => ({
  id: p.id,
  name: p.name,
  description: p.description,
  weekdays: (p.weekdays as number[] | null) ?? [],
  exercises: (p.exercises as PlanExercise[] | null) ?? [],
  archived: p.archivedAt !== null,
  createdAt: p.createdAt.toISOString(),
});

const toLogDto = (l: WorkoutLog): LogDto => ({
  id: l.id,
  date: dateToDay(l.date),
  type: l.type,
  planId: l.planId,
  title: l.title,
  durationMinutes: l.durationMinutes,
  distanceKm: l.distanceKm,
  effort: l.effort,
  notes: l.notes,
  sets: (l.sets as LogDto['sets'] | null) ?? [],
  createdAt: l.createdAt.toISOString(),
});

export function healthRoutes({ db }: Deps): AnyRoute[] {
  const tag = 'Saúde';
  const idParams = z.object({ id: idSchema });

  async function findLog(userId: string, id: string) {
    const log = await db.workoutLog.findFirst({ where: { id, userId } });
    if (!log) throw notFound();
    return log;
  }

  return [
    // ---- divisões de treino ----------------------------------------------------------------
    route({
      method: 'get',
      path: '/health/plans',
      tag,
      summary: 'Divisões de treino',
      description:
        'Ex.: Treino A (peito/tríceps), B (costas/bíceps). Arquivadas só com `includeArchived`.',
      query: z.object({ includeArchived: z.stringbool().optional() }),
      response: z.array(workoutPlanSchema),
      async handler({ userId, query }) {
        const plans = await db.workoutPlan.findMany({
          where: { userId, ...(query.includeArchived ? {} : { archivedAt: null }) },
          orderBy: { createdAt: 'asc' },
        });
        return plans.map(toPlanDto);
      },
    }),

    route({
      method: 'post',
      path: '/health/plans',
      tag,
      summary: 'Criar divisão de treino',
      body: createWorkoutPlanInputSchema,
      response: workoutPlanSchema,
      async handler({ userId, body }) {
        const plan = await db.workoutPlan.create({
          data: {
            userId,
            name: body.name,
            description: body.description ?? null,
            weekdays: [...new Set(body.weekdays ?? [])].sort(),
            exercises: body.exercises ?? [],
          },
        });
        return toPlanDto(plan);
      },
    }),

    route({
      method: 'patch',
      path: '/health/plans/:id',
      tag,
      summary: 'Editar ou arquivar divisão de treino',
      params: idParams,
      body: updateWorkoutPlanInputSchema,
      response: workoutPlanSchema,
      async handler({ userId, params, body }) {
        if (!(await db.workoutPlan.findFirst({ where: { id: params.id, userId } })))
          throw notFound();
        const { archived, weekdays, ...rest } = body;
        const plan = await db.workoutPlan.update({
          where: { id: params.id },
          data: {
            ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)),
            ...(weekdays ? { weekdays: [...new Set(weekdays)].sort() } : {}),
            ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
          },
        });
        return toPlanDto(plan);
      },
    }),

    route({
      method: 'delete',
      path: '/health/plans/:id',
      tag,
      summary: 'Excluir divisão de treino',
      description: 'Os treinos já registrados ficam no histórico, sem divisão.',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.workoutPlan.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    // ---- registros de treino ---------------------------------------------------------------
    route({
      method: 'get',
      path: '/health/workouts',
      tag,
      summary: 'Treinos e caminhadas registrados',
      query: z.object({
        from: dateSchema.optional(),
        to: dateSchema.optional(),
        type: workoutTypeSchema.optional(),
      }),
      response: z.array(workoutLogSchema),
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        const to = query.to ?? user.today;
        const from = query.from ?? addDays(to, -89);
        const logs = await db.workoutLog.findMany({
          where: {
            userId,
            date: { gte: dayToDate(from), lte: dayToDate(to) },
            ...(query.type ? { type: query.type } : {}),
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
        return logs.map(toLogDto);
      },
    }),

    route({
      method: 'post',
      path: '/health/workouts',
      tag,
      summary: 'Registrar treino ou caminhada',
      description:
        'Com `durationMinutes`, o tempo entra também no registro de tempo (tipo "treino"). `sets` guarda as séries ' +
        '(exercício, repetições, carga).',
      body: createWorkoutLogInputSchema,
      response: workoutLogSchema,
      async handler({ userId, body }) {
        const user = await userClock(db, userId);
        const date = body.date ?? user.today;
        if (date > user.today)
          throw badRequest('Não é possível registrar um treino em um dia futuro.');
        await assertPlan(userId, body.planId);

        const plan = body.planId
          ? await db.workoutPlan.findUnique({ where: { id: body.planId } })
          : null;
        const type = body.type ?? 'strength';
        const title = body.title || plan?.name || TYPE_LABEL[type];

        const timeEntryId = await syncTimeEntry(db, userId, {
          entryId: null,
          minutes: body.durationMinutes,
          date,
          kind: 'workout',
          title,
          timezone: user.timezone,
        });
        const log = await db.workoutLog.create({
          data: {
            userId,
            planId: body.planId ?? null,
            date: dayToDate(date),
            type,
            title,
            durationMinutes: body.durationMinutes ?? null,
            distanceKm: body.distanceKm ?? null,
            effort: body.effort ?? null,
            notes: body.notes ?? null,
            sets: body.sets ?? [],
            timeEntryId,
          },
        });
        return toLogDto(log);
      },
    }),

    route({
      method: 'patch',
      path: '/health/workouts/:id',
      tag,
      summary: 'Corrigir registro de treino',
      params: idParams,
      body: updateWorkoutLogInputSchema,
      response: workoutLogSchema,
      async handler({ userId, params, body }) {
        const current = await findLog(userId, params.id);
        const user = await userClock(db, userId);
        await assertPlan(userId, body.planId);
        const date = body.date ?? dateToDay(current.date);
        if (date > user.today)
          throw badRequest('Não é possível registrar um treino em um dia futuro.');
        const minutes =
          body.durationMinutes !== undefined ? body.durationMinutes : current.durationMinutes;
        const title = body.title || current.title;

        const timeEntryId = await syncTimeEntry(db, userId, {
          entryId: current.timeEntryId,
          minutes,
          date,
          kind: 'workout',
          title,
          timezone: user.timezone,
        });
        const { date: _d, sets, ...rest } = body;
        const log = await db.workoutLog.update({
          where: { id: current.id },
          data: {
            ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)),
            title,
            date: dayToDate(date),
            timeEntryId,
            ...(sets ? { sets } : {}),
          },
        });
        return toLogDto(log);
      },
    }),

    route({
      method: 'delete',
      path: '/health/workouts/:id',
      tag,
      summary: 'Apagar registro de treino',
      params: idParams,
      async handler({ userId, params }) {
        const log = await findLog(userId, params.id);
        await dropTimeEntry(db, userId, log.timeEntryId);
        await db.workoutLog.delete({ where: { id: log.id } });
      },
    }),

    route({
      method: 'get',
      path: '/health/frequency',
      tag,
      summary: 'Frequência semanal de treino',
      description:
        'Sessões, minutos e distância por semana, da mais antiga para a atual, com a meta semanal de sessões.',
      query: z.object({ weeks: z.coerce.number().int().min(1).max(52).default(8) }),
      response: workoutFrequencySchema,
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        const thisWeek = startOfWeek(user.today, user.weekStartsOn);
        const first = addDays(thisWeek, -7 * (query.weeks - 1));
        const [logs, target] = await Promise.all([
          db.workoutLog.findMany({
            where: {
              userId,
              date: { gte: dayToDate(first), lte: dayToDate(addDays(thisWeek, 6)) },
            },
          }),
          targetFor(db, userId, 'health'),
        ]);
        const weeks = [];
        for (let i = 0; i < query.weeks; i++) {
          const start = addDays(first, i * 7);
          const inWeek = logs.filter(
            (l) => dateToDay(l.date) >= start && dateToDay(l.date) <= addDays(start, 6),
          );
          const byType: Record<string, number> = {};
          for (const l of inWeek) byType[l.type] = (byType[l.type] ?? 0) + 1;
          weeks.push({
            start,
            sessions: inWeek.length,
            minutes: inWeek.reduce((n, l) => n + (l.durationMinutes ?? 0), 0),
            distanceKm: Math.round(inWeek.reduce((n, l) => n + (l.distanceKm ?? 0), 0) * 100) / 100,
            byType,
          });
        }
        return {
          weeks,
          weeklyTargetSessions: target?.metric === 'workout_sessions' ? target.targetValue : null,
        };
      },
    }),
  ];

  async function assertPlan(userId: string, planId: string | null | undefined) {
    if (planId && !(await db.workoutPlan.findFirst({ where: { id: planId, userId } })))
      throw badRequest('Divisão de treino inválida.');
  }
}
