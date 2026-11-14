import {
  createGoalInputSchema,
  createMilestoneInputSchema,
  createVisionItemInputSchema,
  goalCategorySchema,
  goalSchema,
  goalStatusSchema,
  idSchema,
  setMetricCurrentInputSchema,
  updateGoalInputSchema,
  updateMilestoneInputSchema,
  updateVisionItemInputSchema,
  visionItemSchema,
  type VisionItem as VisionDto,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Deps } from '../../core/deps';
import { badRequest, conflict, notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { assertOwned, userClock } from '../../core/ownership';
import { dayToDate } from '../../core/time';
import type { VisionItem } from '../../generated/prisma/client';
import { buildGoalViews } from './goal.views';

const toVisionDto = (v: VisionItem): VisionDto => ({
  id: v.id,
  year: v.year,
  title: v.title,
  description: v.description,
  category: v.category,
  goalId: v.goalId,
  achieved: v.achieved,
  position: v.position,
});

export function goalsRoutes({ db }: Deps): AnyRoute[] {
  const idParams = z.object({ id: idSchema });
  const milestoneParams = z.object({ goalId: idSchema, milestoneId: idSchema });

  async function viewOf(userId: string, goalId: string) {
    const user = await userClock(db, userId);
    const goal = await db.goal.findFirst({
      where: { id: goalId, userId },
      include: { milestones: true },
    });
    if (!goal) throw notFound();
    const [view] = await buildGoalViews(db, userId, [goal], user.today, { snapshot: true });
    return view!;
  }

  /** A conta ligada precisa ser uma reserva do usuário e não pode estar em outro objetivo. */
  async function assertReserve(
    userId: string,
    accountId: string | null | undefined,
    exceptGoalId?: string,
  ) {
    if (!accountId) return;
    const account = await db.account.findFirst({ where: { id: accountId, userId } });
    if (!account) throw badRequest('Conta inválida.');
    if (!account.isReserved) throw badRequest('Escolha uma conta marcada como reserva.');
    const taken = await db.goal.findFirst({
      where: { linkedAccountId: accountId, ...(exceptGoalId ? { id: { not: exceptGoalId } } : {}) },
    });
    if (taken) throw conflict('Esta reserva já está ligada a outro objetivo.');
  }

  async function assertHabits(userId: string, habitIds: string[] | undefined) {
    if (!habitIds?.length) return;
    const owned = await db.habit.count({ where: { userId, id: { in: habitIds } } });
    if (owned !== new Set(habitIds).size) throw badRequest('Um dos hábitos escolhidos não existe.');
  }

  return [
    route({
      method: 'get',
      path: '/goals',
      tag: 'Objetivos',
      summary: 'Listar objetivos',
      description:
        'Progresso, métrica atual e histórico calculados na hora a partir dos dados reais (marcos, saldo da reserva, ' +
        'horas registradas, check-ins). Cada consulta grava o ponto de hoje no histórico. Sem `status`, os arquivados ficam de fora.',
      query: z.object({
        status: goalStatusSchema.optional(),
        category: goalCategorySchema.optional(),
      }),
      response: z.array(goalSchema),
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        const goals = await db.goal.findMany({
          where: {
            userId,
            status: query.status ?? { not: 'archived' },
            ...(query.category ? { category: query.category } : {}),
          },
          include: { milestones: true },
          orderBy: [{ targetDate: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
        });
        return buildGoalViews(db, userId, goals, user.today, { snapshot: true });
      },
    }),

    route({
      method: 'get',
      path: '/goals/:id',
      tag: 'Objetivos',
      summary: 'Buscar objetivo',
      params: idParams,
      response: goalSchema,
      handler: ({ userId, params }) => viewOf(userId, params.id),
    }),

    route({
      method: 'post',
      path: '/goals',
      tag: 'Objetivos',
      summary: 'Criar objetivo',
      description:
        '`progressMode`: `manual`, `milestones` (marcos concluídos ÷ total) ou `metric` (atual ÷ meta). Com `linkedAccountId` ' +
        '(uma reserva), a métrica de dinheiro passa a ser o saldo dela. `habitIds` vincula hábitos existentes.',
      body: createGoalInputSchema,
      response: goalSchema,
      async handler({ userId, body }) {
        const user = await userClock(db, userId);
        await assertOwned(db, 'area', userId, body.areaId);
        await assertReserve(userId, body.linkedAccountId);
        await assertHabits(userId, body.habitIds);

        const metric = body.metric ?? null;
        if (body.linkedAccountId && !metric)
          throw badRequest('Informe a meta (valor alvo) do objetivo financeiro.');
        if (body.progressMode === 'metric' && !metric)
          throw badRequest('Informe a métrica do objetivo.');

        const goal = await db.goal.create({
          data: {
            userId,
            name: body.name,
            description: body.description ?? null,
            category: body.category,
            areaId: body.areaId ?? null,
            startDate: dayToDate(body.startDate ?? user.today),
            targetDate: body.targetDate ? dayToDate(body.targetDate) : null,
            progressMode:
              body.progressMode ??
              (metric ? 'metric' : body.milestones?.length ? 'milestones' : 'manual'),
            metricKind: metric?.kind ?? null,
            metricTarget: metric?.target ?? null,
            metricUnit: metric?.unit ?? null,
            linkedAccountId: body.linkedAccountId ?? null,
            milestones: {
              create: (body.milestones ?? []).map((m, i) => ({
                userId,
                title: m.title,
                position: (i + 1) * 1000,
              })),
            },
          },
        });
        if (body.habitIds?.length) {
          await db.habit.updateMany({
            where: { userId, id: { in: body.habitIds } },
            data: { goalId: goal.id },
          });
        }
        return viewOf(userId, goal.id);
      },
    }),

    route({
      method: 'patch',
      path: '/goals/:id',
      tag: 'Objetivos',
      summary: 'Editar objetivo',
      description:
        'Também muda o status (ativo, pausado, concluído, arquivado). `progress` só vale com `progressMode = manual`. ' +
        '`habitIds` substitui o conjunto de hábitos vinculados.',
      params: idParams,
      body: updateGoalInputSchema,
      response: goalSchema,
      async handler({ userId, params, body }) {
        const current = await db.goal.findFirst({ where: { id: params.id, userId } });
        if (!current) throw notFound();
        await assertOwned(db, 'area', userId, body.areaId);
        await assertReserve(userId, body.linkedAccountId, current.id);
        await assertHabits(userId, body.habitIds);

        const mode = body.progressMode ?? current.progressMode;
        const { metric, habitIds, progress, startDate, targetDate, status, ...rest } = body;
        const now = clock.now();

        await db.goal.update({
          where: { id: current.id },
          data: {
            ...rest,
            ...(startDate ? { startDate: dayToDate(startDate) } : {}),
            ...(targetDate !== undefined
              ? { targetDate: targetDate ? dayToDate(targetDate) : null }
              : {}),
            ...(metric !== undefined
              ? {
                  metricKind: metric?.kind ?? null,
                  metricTarget: metric?.target ?? null,
                  metricUnit: metric?.unit ?? null,
                }
              : {}),
            ...(progress !== undefined && mode === 'manual' ? { manualProgress: progress } : {}),
            ...(status
              ? {
                  status,
                  completedAt: status === 'completed' ? (current.completedAt ?? now) : null,
                }
              : {}),
          },
        });

        if (habitIds) {
          await db.$transaction([
            db.habit.updateMany({
              where: { userId, goalId: current.id, id: { notIn: habitIds } },
              data: { goalId: null },
            }),
            db.habit.updateMany({
              where: { userId, id: { in: habitIds } },
              data: { goalId: current.id },
            }),
          ]);
        }
        const after = await db.goal.findUniqueOrThrow({ where: { id: current.id } });
        if (mode === 'metric' && !after.metricKind)
          throw badRequest('Informe a métrica do objetivo.');
        return viewOf(userId, current.id);
      },
    }),

    route({
      method: 'put',
      path: '/goals/:id/metric',
      tag: 'Objetivos',
      summary: 'Informar o valor atual da métrica',
      description:
        'Para métricas sem fonte automática (ex.: "ler 12 livros"). Em métricas de horas e de contagem, o valor informado ' +
        'soma-se ao que o sistema já mede (tempo registrado / check-ins).',
      params: idParams,
      body: setMetricCurrentInputSchema,
      response: goalSchema,
      async handler({ userId, params, body }) {
        const goal = await db.goal.findFirst({ where: { id: params.id, userId } });
        if (!goal) throw notFound();
        if (!goal.metricKind) throw badRequest('Este objetivo não tem métrica.');
        await db.goal.update({
          where: { id: goal.id },
          data: { metricCurrent: body.current, lastActivityAt: clock.now() },
        });
        return viewOf(userId, goal.id);
      },
    }),

    route({
      method: 'delete',
      path: '/goals/:id',
      tag: 'Objetivos',
      summary: 'Excluir objetivo',
      description: 'Tarefas, hábitos e projetos vinculados continuam existindo, sem objetivo.',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.goal.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    // ---- marcos ----------------------------------------------------------------------------
    route({
      method: 'post',
      path: '/goals/:id/milestones',
      tag: 'Objetivos',
      summary: 'Adicionar marco',
      params: idParams,
      body: createMilestoneInputSchema,
      response: goalSchema,
      async handler({ userId, params, body }) {
        const goal = await db.goal.findFirst({ where: { id: params.id, userId } });
        if (!goal) throw notFound();
        const last = await db.milestone.aggregate({
          where: { goalId: goal.id },
          _max: { position: true },
        });
        await db.milestone.create({
          data: {
            userId,
            goalId: goal.id,
            title: body.title,
            dueDate: body.dueDate ? dayToDate(body.dueDate) : null,
            position: (last._max.position ?? 0) + 1000,
          },
        });
        return viewOf(userId, goal.id);
      },
    }),

    route({
      method: 'patch',
      path: '/goals/:goalId/milestones/:milestoneId',
      tag: 'Objetivos',
      summary: 'Editar ou concluir marco',
      description: 'Devolve o objetivo com o progresso recalculado.',
      params: milestoneParams,
      body: updateMilestoneInputSchema,
      response: goalSchema,
      async handler({ userId, params, body }) {
        const milestone = await db.milestone.findFirst({
          where: { id: params.milestoneId, goalId: params.goalId, userId },
        });
        if (!milestone) throw notFound();
        const { done, dueDate, ...rest } = body;
        await db.milestone.update({
          where: { id: milestone.id },
          data: {
            ...rest,
            ...(dueDate !== undefined ? { dueDate: dueDate ? dayToDate(dueDate) : null } : {}),
            ...(done === undefined
              ? {}
              : { completedAt: done ? (milestone.completedAt ?? clock.now()) : null }),
          },
        });
        return viewOf(userId, params.goalId);
      },
    }),

    route({
      method: 'delete',
      path: '/goals/:goalId/milestones/:milestoneId',
      tag: 'Objetivos',
      summary: 'Remover marco',
      description: 'Devolve o objetivo com o progresso recalculado.',
      params: milestoneParams,
      response: goalSchema,
      status: 200,
      async handler({ userId, params }) {
        const { count } = await db.milestone.deleteMany({
          where: { id: params.milestoneId, goalId: params.goalId, userId },
        });
        if (count === 0) throw notFound();
        return viewOf(userId, params.goalId);
      },
    }),

    // ---- Visão do ano ----------------------------------------------------------------------
    route({
      method: 'get',
      path: '/vision',
      tag: 'Objetivos',
      summary: 'Visão do ano',
      description: 'Os principais resultados que o usuário quer para um ano (ex.: Visão 2027).',
      query: z.object({ year: z.coerce.number().int().min(2000).max(2100).optional() }),
      response: z.array(visionItemSchema),
      async handler({ userId, query }) {
        const items = await db.visionItem.findMany({
          where: { userId, ...(query.year ? { year: query.year } : {}) },
          orderBy: [{ year: 'asc' }, { position: 'asc' }],
        });
        return items.map(toVisionDto);
      },
    }),

    route({
      method: 'post',
      path: '/vision',
      tag: 'Objetivos',
      summary: 'Adicionar resultado à visão',
      body: createVisionItemInputSchema,
      response: visionItemSchema,
      async handler({ userId, body }) {
        await assertOwned(db, 'goal', userId, body.goalId);
        const last = await db.visionItem.aggregate({
          where: { userId, year: body.year },
          _max: { position: true },
        });
        const item = await db.visionItem.create({
          data: {
            userId,
            year: body.year,
            title: body.title,
            description: body.description ?? null,
            category: body.category,
            goalId: body.goalId ?? null,
            position: (last._max.position ?? 0) + 1000,
          },
        });
        return toVisionDto(item);
      },
    }),

    route({
      method: 'patch',
      path: '/vision/:id',
      tag: 'Objetivos',
      summary: 'Editar resultado da visão',
      params: idParams,
      body: updateVisionItemInputSchema,
      response: visionItemSchema,
      async handler({ userId, params, body }) {
        const current = await db.visionItem.findFirst({ where: { id: params.id, userId } });
        if (!current) throw notFound();
        await assertOwned(db, 'goal', userId, body.goalId);
        return toVisionDto(await db.visionItem.update({ where: { id: current.id }, data: body }));
      },
    }),

    route({
      method: 'delete',
      path: '/vision/:id',
      tag: 'Objetivos',
      summary: 'Remover resultado da visão',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.visionItem.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),
  ];
}
