import {
  reviewAnswersSchema,
  reviewMetricsSchema,
  reviewOverviewSchema,
  reviewQuerySchema,
  reviewSchema,
  reviewTypeSchema,
  saveReviewInputSchema,
  type Review as ReviewDto,
  type ReviewType,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Deps } from '../../core/deps';
import { badRequest } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { userClock } from '../../core/ownership';
import {
  addDays,
  dateToDay,
  dayToDate,
  endOfMonth,
  startOfMonth,
  startOfWeek,
} from '../../core/time';
import type { Review } from '../../generated/prisma/client';
import { computeMetrics } from './metrics';

/** Semana de `weekStartsOn` (segunda por padrão) ou mês civil que contém `day`. */
export function periodOf(type: ReviewType, day: string, weekStartsOn: number) {
  if (type === 'weekly') {
    const start = startOfWeek(day, weekStartsOn);
    return { start, end: addDays(start, 6) };
  }
  return { start: startOfMonth(day), end: endOfMonth(day) };
}

const toReviewDto = (r: Review): ReviewDto => ({
  id: r.id,
  type: r.type,
  periodStart: dateToDay(r.periodStart),
  periodEnd: dateToDay(r.periodEnd),
  status: r.status,
  answers: reviewAnswersSchema.parse(r.answers ?? {}),
  priorities: (r.priorities as string[] | null) ?? [],
  completedAt: r.completedAt?.toISOString() ?? null,
  updatedAt: r.updatedAt.toISOString(),
});

export function reviewsRoutes({ db }: Deps): AnyRoute[] {
  async function overview(userId: string, type: ReviewType, day: string) {
    const user = await userClock(db, userId);
    const period = periodOf(type, day, user.weekStartsOn);
    const review = await db.review.findUnique({
      where: { userId_type_periodStart: { userId, type, periodStart: dayToDate(period.start) } },
    });
    // Revisão concluída mostra os números congelados no dia em que foi fechada.
    const frozen =
      review?.status === 'completed' ? reviewMetricsSchema.safeParse(review.metrics) : null;
    const metrics = frozen?.success
      ? frozen.data
      : await computeMetrics(db, userId, user, period.start, period.end);
    return {
      type,
      periodStart: period.start,
      periodEnd: period.end,
      metrics,
      review: review ? toReviewDto(review) : null,
    };
  }

  return [
    route({
      method: 'get',
      path: '/reviews',
      tag: 'Revisões',
      summary: 'Histórico de revisões',
      query: z.object({
        type: reviewTypeSchema.optional(),
        limit: z.coerce.number().int().min(1).max(104).default(52),
      }),
      response: z.array(reviewSchema),
      async handler({ userId, query }) {
        const rows = await db.review.findMany({
          where: { userId, ...(query.type ? { type: query.type } : {}) },
          orderBy: { periodStart: 'desc' },
          take: query.limit,
        });
        return rows.map(toReviewDto);
      },
    }),

    route({
      method: 'get',
      path: '/reviews/:type/current',
      tag: 'Revisões',
      summary: 'Revisão de um período, já com os números',
      description:
        'A revisão chega preenchida com as métricas do período (tarefas, hábitos, tempo, finanças, objetivos, humor). ' +
        '`date` é qualquer dia do período; padrão = hoje. Se a revisão já foi concluída, as métricas são as congeladas.',
      params: z.object({ type: reviewTypeSchema }),
      query: reviewQuerySchema,
      response: reviewOverviewSchema,
      async handler({ userId, params, query }) {
        const user = await userClock(db, userId);
        return overview(userId, params.type, query.date ?? user.today);
      },
    }),

    route({
      method: 'put',
      path: '/reviews/:type/:periodStart',
      tag: 'Revisões',
      summary: 'Salvar ou concluir a revisão',
      description:
        '`periodStart` é o primeiro dia do período (segunda-feira ou dia 1). Com `complete: true`, a revisão é ' +
        'concluída e as métricas daquele momento são guardadas no histórico.',
      params: z.object({ type: reviewTypeSchema, periodStart: z.iso.date() }),
      body: saveReviewInputSchema,
      response: reviewOverviewSchema,
      async handler({ userId, params, body }) {
        const user = await userClock(db, userId);
        const period = periodOf(params.type, params.periodStart, user.weekStartsOn);
        if (period.start !== params.periodStart) {
          throw badRequest(`Para esta revisão, o período começa em ${period.start}.`);
        }
        if (period.start > user.today) throw badRequest('Esse período ainda não começou.');

        const key = {
          userId_type_periodStart: {
            userId,
            type: params.type,
            periodStart: dayToDate(period.start),
          },
        };
        const current = await db.review.findUnique({ where: key });
        const answers = {
          ...reviewAnswersSchema.parse(current?.answers ?? {}),
          ...(body.answers ?? {}),
        };
        const priorities = body.priorities ?? (current?.priorities as string[] | null) ?? [];

        const completing = body.complete === true;
        const metrics = completing
          ? await computeMetrics(db, userId, user, period.start, period.end)
          : undefined;

        await db.review.upsert({
          where: key,
          create: {
            userId,
            type: params.type,
            periodStart: dayToDate(period.start),
            periodEnd: dayToDate(period.end),
            answers,
            priorities,
            ...(completing
              ? { status: 'completed' as const, completedAt: clock.now(), metrics }
              : {}),
          },
          update: {
            answers,
            priorities,
            ...(completing
              ? { status: 'completed' as const, completedAt: clock.now(), metrics }
              : {}),
          },
        });
        return overview(userId, params.type, period.start);
      },
    }),
  ];
}
