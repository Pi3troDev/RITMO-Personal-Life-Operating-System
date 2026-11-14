import {
  createHabitInputSchema,
  habitCheckinSchema,
  habitSchema,
  habitStatusSchema,
  idSchema,
  updateHabitInputSchema,
  upsertCheckinInputSchema,
  type Habit as HabitDto,
  type HabitCheckin as CheckinDto,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Db } from '../../core/db';
import type { Deps } from '../../core/deps';
import { badRequest, notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { assertOwned, userClock } from '../../core/ownership';
import { addDays, dateToDay, dayToDate, localDateOf } from '../../core/time';
import type { Habit, HabitCheckin } from '../../generated/prisma/client';
import { habitStats, type CheckinStatus } from './stats';

const STATS_WINDOW_DAYS = 1500;

export const toCheckinDto = (c: HabitCheckin): CheckinDto => ({
  habitId: c.habitId,
  date: dateToDay(c.date),
  status: c.status,
  value: c.value,
  note: c.note,
});

/** Hábitos com as estatísticas calculadas (sequência atual, melhor sequência, taxa de 30 dias). */
export async function habitViews(
  db: Db,
  userId: string,
  habits: Habit[],
  today: string,
  tz: string,
): Promise<HabitDto[]> {
  if (habits.length === 0) return [];
  const checkins = await db.habitCheckin.findMany({
    where: {
      userId,
      habitId: { in: habits.map((h) => h.id) },
      date: { gte: dayToDate(addDays(today, -STATS_WINDOW_DAYS)) },
    },
    select: { habitId: true, date: true, status: true },
  });
  const byHabit = new Map<string, Map<string, CheckinStatus>>();
  for (const c of checkins) {
    const map = byHabit.get(c.habitId) ?? new Map<string, CheckinStatus>();
    map.set(dateToDay(c.date), c.status);
    byHabit.set(c.habitId, map);
  }

  return habits.map((h) => ({
    id: h.id,
    name: h.name,
    areaId: h.areaId,
    goalId: h.goalId,
    weekdays: (h.weekdays as number[]) ?? [],
    suggestedTime: h.suggestedTime,
    targetType: h.targetType,
    targetValue: h.targetValue,
    targetUnit: h.targetUnit,
    notes: h.notes,
    status: h.status,
    createdAt: h.createdAt.toISOString(),
    stats: habitStats({
      weekdays: (h.weekdays as number[]) ?? [],
      createdDay: localDateOf(h.createdAt, tz),
      checkins: byHabit.get(h.id) ?? new Map(),
      today,
    }),
  }));
}

export function habitsRoutes({ db }: Deps): AnyRoute[] {
  const idParams = z.object({ id: idSchema });

  async function findHabit(userId: string, id: string) {
    const habit = await db.habit.findFirst({ where: { id, userId } });
    if (!habit) throw notFound();
    return habit;
  }

  async function viewOf(userId: string, habit: Habit) {
    const user = await userClock(db, userId);
    const [view] = await habitViews(db, userId, [habit], user.today, user.timezone);
    return view!;
  }

  return [
    route({
      method: 'get',
      path: '/habits',
      tag: 'Hábitos',
      summary: 'Listar hábitos',
      description: 'Com estatísticas calculadas. Sem `status`, os arquivados ficam de fora.',
      query: z.object({ status: habitStatusSchema.optional(), goalId: idSchema.optional() }),
      response: z.array(habitSchema),
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        const habits = await db.habit.findMany({
          where: {
            userId,
            status: query.status ?? { not: 'archived' },
            ...(query.goalId ? { goalId: query.goalId } : {}),
          },
          orderBy: { createdAt: 'asc' },
        });
        return habitViews(db, userId, habits, user.today, user.timezone);
      },
    }),

    route({
      method: 'get',
      path: '/habits/checkins',
      tag: 'Hábitos',
      summary: 'Check-ins de todos os hábitos',
      description:
        'Sem `from`/`to`, devolve os últimos 400 dias (para o calendário de consistência).',
      query: z.object({
        from: z.iso.date().optional(),
        to: z.iso.date().optional(),
        habitId: idSchema.optional(),
      }),
      response: z.array(habitCheckinSchema),
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        const to = query.to ?? user.today;
        const from = query.from ?? addDays(to, -399);
        const rows = await db.habitCheckin.findMany({
          where: {
            userId,
            date: { gte: dayToDate(from), lte: dayToDate(to) },
            ...(query.habitId ? { habitId: query.habitId } : {}),
          },
          orderBy: { date: 'asc' },
        });
        return rows.map(toCheckinDto);
      },
    }),

    route({
      method: 'get',
      path: '/habits/:id',
      tag: 'Hábitos',
      summary: 'Buscar hábito',
      params: idParams,
      response: habitSchema,
      async handler({ userId, params }) {
        return viewOf(userId, await findHabit(userId, params.id));
      },
    }),

    route({
      method: 'post',
      path: '/habits',
      tag: 'Hábitos',
      summary: 'Criar hábito',
      description: '`weekdays`: 0 = domingo … 6 = sábado. `suggestedTime` em `HH:mm`.',
      body: createHabitInputSchema,
      response: habitSchema,
      async handler({ userId, body }) {
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        const habit = await db.habit.create({
          data: {
            userId,
            name: body.name,
            areaId: body.areaId ?? null,
            goalId: body.goalId ?? null,
            weekdays: [...new Set(body.weekdays)].sort(),
            suggestedTime: body.suggestedTime ?? null,
            targetType: body.targetType ?? 'check',
            targetValue: body.targetValue ?? null,
            targetUnit: body.targetUnit ?? null,
            notes: body.notes ?? null,
          },
        });
        return viewOf(userId, habit);
      },
    }),

    route({
      method: 'patch',
      path: '/habits/:id',
      tag: 'Hábitos',
      summary: 'Editar, pausar ou arquivar hábito',
      description: 'Pausar não apaga o histórico nem conta como falha.',
      params: idParams,
      body: updateHabitInputSchema,
      response: habitSchema,
      async handler({ userId, params, body }) {
        await findHabit(userId, params.id);
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        const { weekdays, ...rest } = body;
        const habit = await db.habit.update({
          where: { id: params.id },
          data: { ...rest, ...(weekdays ? { weekdays: [...new Set(weekdays)].sort() } : {}) },
        });
        return viewOf(userId, habit);
      },
    }),

    route({
      method: 'delete',
      path: '/habits/:id',
      tag: 'Hábitos',
      summary: 'Excluir hábito e seu histórico',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.habit.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    route({
      method: 'put',
      path: '/habits/:id/checkins/:date',
      tag: 'Hábitos',
      summary: 'Registrar (ou corrigir) o check-in de um dia',
      description:
        '`done` = feito; `skipped` = dia excepcional (viagem, doença…), que não conta como feito nem quebra a sequência. ' +
        'Não existe "falhou": um dia agendado sem check-in é só "não registrado". Devolve o hábito com estatísticas atualizadas.',
      params: z.object({ id: idSchema, date: z.iso.date() }),
      body: upsertCheckinInputSchema,
      response: habitSchema,
      async handler({ userId, params, body }) {
        const habit = await findHabit(userId, params.id);
        const user = await userClock(db, userId);
        if (params.date > user.today) throw badRequest('Não é possível registrar um dia futuro.');

        const data = {
          status: body.status,
          value: body.value ?? (body.status === 'done' ? habit.targetValue : null),
          note: body.note ?? null,
        };
        await db.habitCheckin.upsert({
          where: { habitId_date: { habitId: habit.id, date: dayToDate(params.date) } },
          create: { userId, habitId: habit.id, date: dayToDate(params.date), ...data },
          update: data,
        });
        return viewOf(userId, habit);
      },
    }),

    route({
      method: 'delete',
      path: '/habits/:id/checkins/:date',
      tag: 'Hábitos',
      summary: 'Remover o check-in de um dia',
      params: z.object({ id: idSchema, date: z.iso.date() }),
      async handler({ userId, params }) {
        const habit = await findHabit(userId, params.id);
        await db.habitCheckin.deleteMany({
          where: { habitId: habit.id, date: dayToDate(params.date), userId },
        });
      },
    }),
  ];
}
