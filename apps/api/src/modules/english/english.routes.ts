import {
  createVocabularyInputSchema,
  englishSummarySchema,
  idSchema,
  listVocabularyQuerySchema,
  updateVocabularyInputSchema,
  vocabularyItemSchema,
  type VocabularyItem as VocabDto,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Deps } from '../../core/deps';
import { notFound } from '../../core/errors';
import { crudRoutes, defined } from '../../core/http/crud';
import { route, type AnyRoute } from '../../core/http/route';
import { userClock } from '../../core/ownership';
import { dateToDay, dayToDate } from '../../core/time';
import type { VocabularyItem } from '../../generated/prisma/client';
import { targetFor, weekOf } from '../targets/progress';

const toDto = (v: VocabularyItem): VocabDto => ({
  id: v.id,
  kind: v.kind,
  term: v.term,
  meaning: v.meaning,
  example: v.example,
  status: v.status,
  tags: (v.tags as string[] | null) ?? [],
  reviewCount: v.reviewCount,
  lastReviewedAt: v.lastReviewedAt?.toISOString() ?? null,
  nextReviewAt: v.nextReviewAt?.toISOString() ?? null,
  createdAt: v.createdAt.toISOString(),
});

export function englishRoutes({ db }: Deps): AnyRoute[] {
  const tag = 'Inglês';

  return [
    ...crudRoutes({
      db,
      tag,
      path: '/english/vocabulary',
      names: ['palavra ou frase', 'vocabulário'],
      model: 'vocabularyItem',
      response: vocabularyItemSchema,
      create: createVocabularyInputSchema,
      update: updateVocabularyInputSchema,
      query: listVocabularyQuerySchema,
      where: (q: z.infer<typeof listVocabularyQuerySchema>) => ({
        ...(q.kind ? { kind: q.kind } : {}),
        ...(q.status ? { status: q.status } : {}),
        ...(q.q ? { OR: [{ term: { contains: q.q } }, { meaning: { contains: q.q } }] } : {}),
      }),
      orderBy: { createdAt: 'desc' },
      toDto: (row: VocabularyItem) => toDto(row),
      toCreate: (input: z.infer<typeof createVocabularyInputSchema>) => ({
        kind: input.kind ?? 'word',
        term: input.term,
        meaning: input.meaning,
        example: input.example ?? null,
        tags: input.tags ?? [],
      }),
      toUpdate: (input: z.infer<typeof updateVocabularyInputSchema>) => defined(input),
    }),

    route({
      method: 'post',
      path: '/english/vocabulary/:id/review',
      tag,
      summary: 'Registrar uma revisão do item',
      description:
        'Conta mais uma revisão e guarda quando foi a última. O agendamento da próxima revisão (repetição espaçada) ' +
        'fica fora da primeira versão: só os campos existem.',
      params: z.object({ id: idSchema }),
      response: vocabularyItemSchema,
      status: 200,
      async handler({ userId, params }) {
        const item = await db.vocabularyItem.findFirst({ where: { id: params.id, userId } });
        if (!item) throw notFound();
        const updated = await db.vocabularyItem.update({
          where: { id: item.id },
          data: {
            reviewCount: { increment: 1 },
            lastReviewedAt: clock.now(),
            status: item.status === 'new' ? 'learning' : item.status,
          },
        });
        return toDto(updated);
      },
    }),

    route({
      method: 'get',
      path: '/english/summary',
      tag,
      summary: 'Resumo da semana de inglês',
      description:
        'Tempo de prática por habilidade (listening, reading, speaking, writing), dias praticados, meta semanal e ' +
        'vocabulário por estágio. A prática é registrada em `/time-entries` com `kind=english` e `englishSkill`.',
      response: englishSummarySchema,
      async handler({ userId }) {
        const user = await userClock(db, userId);
        const week = weekOf(user);
        const [entries, vocab, target] = await Promise.all([
          db.timeEntry.findMany({
            where: {
              userId,
              kind: 'english',
              timerState: 'stopped',
              localDate: { gte: dayToDate(week.start), lte: dayToDate(week.end) },
            },
            select: { englishSkill: true, durationSeconds: true, localDate: true },
          }),
          db.vocabularyItem.groupBy({ by: ['status'], where: { userId }, _count: { _all: true } }),
          targetFor(db, userId, 'english'),
        ]);

        const minutesBySkill = { listening: 0, reading: 0, speaking: 0, writing: 0, untagged: 0 };
        const days = new Set<string>();
        for (const e of entries) {
          minutesBySkill[e.englishSkill ?? 'untagged'] += Math.round(e.durationSeconds / 60);
          days.add(dateToDay(e.localDate));
        }
        const count = (status: string) => vocab.find((v) => v.status === status)?._count._all ?? 0;
        return {
          weekStart: week.start,
          minutesBySkill,
          totalMinutes: Object.values(minutesBySkill).reduce((a, b) => a + b, 0),
          practiceDays: days.size,
          weeklyTargetMinutes: target?.metric === 'time_minutes' ? target.targetValue : null,
          vocabulary: {
            new: count('new'),
            learning: count('learning'),
            mastered: count('mastered'),
          },
        };
      },
    }),
  ];
}
