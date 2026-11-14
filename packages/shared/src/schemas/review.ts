import { z } from 'zod';
import { dateSchema, dateTimeSchema, idSchema } from './common';

export const reviewTypeSchema = z.enum(['weekly', 'monthly']);
export type ReviewType = z.infer<typeof reviewTypeSchema>;

export const reviewMetricsSchema = z.object({
  tasksCompleted: z.number().int(),
  tasksOverdue: z.number().int(),
  /** Compromissos que já passaram e não foram cancelados nem marcados como perdidos. */
  eventsAttended: z.number().int(),
  habits: z.object({
    expected: z.number().int(),
    done: z.number().int(),
    skipped: z.number().int(),
    /** 0–1; nulo quando não havia hábito agendado no período. */
    rate: z.number().min(0).max(1).nullable(),
  }),
  trackedMinutes: z.number().int(),
  trackedByArea: z.array(
    z.object({ areaId: idSchema.nullable(), name: z.string(), minutes: z.number().int() }),
  ),
  finance: z.object({
    incomeCents: z.number().int(),
    expenseCents: z.number().int(),
    /** Aportes em contas reservadas no período (transferências para reserva). */
    reservedCents: z.number().int(),
  }),
  goals: z.array(
    z.object({
      goalId: idSchema,
      name: z.string(),
      progress: z.number(),
      activeInPeriod: z.boolean(),
    }),
  ),
  reflections: z.object({
    count: z.number().int(),
    moods: z.record(z.string(), z.number().int()),
  }),
});
export type ReviewMetrics = z.infer<typeof reviewMetricsSchema>;

export const REVIEW_QUESTIONS = [
  { key: 'wentWell', label: 'O que deu certo?' },
  { key: 'wentBadly', label: 'O que não saiu como esperado?' },
  { key: 'learned', label: 'O que aprendi?' },
  { key: 'improve', label: 'O que quero fazer diferente?' },
  { key: 'gratitude', label: 'Pelo que sou grato(a)?' },
] as const;

export const reviewAnswersSchema = z.object({
  wentWell: z.string().max(4000).default(''),
  wentBadly: z.string().max(4000).default(''),
  learned: z.string().max(4000).default(''),
  improve: z.string().max(4000).default(''),
  gratitude: z.string().max(4000).default(''),
});
export type ReviewAnswers = z.infer<typeof reviewAnswersSchema>;

export const reviewSchema = z.object({
  id: idSchema,
  type: reviewTypeSchema,
  periodStart: dateSchema,
  periodEnd: dateSchema,
  status: z.enum(['draft', 'completed']),
  answers: reviewAnswersSchema,
  /** Até três prioridades do próximo período. */
  priorities: z.array(z.string()).max(3),
  completedAt: dateTimeSchema.nullable(),
  updatedAt: dateTimeSchema,
});
export type Review = z.infer<typeof reviewSchema>;

/** A revisão chega preenchida com os números do período. */
export const reviewOverviewSchema = z.object({
  type: reviewTypeSchema,
  periodStart: dateSchema,
  periodEnd: dateSchema,
  /** Métricas congeladas se a revisão está concluída; calculadas na hora caso contrário. */
  metrics: reviewMetricsSchema,
  review: reviewSchema.nullable(),
});
export type ReviewOverview = z.infer<typeof reviewOverviewSchema>;

export const saveReviewInputSchema = z.object({
  answers: reviewAnswersSchema.partial().optional(),
  priorities: z.array(z.string().trim().min(1).max(200)).max(3).optional(),
  /** `true` conclui a revisão e congela as métricas. */
  complete: z.boolean().optional(),
});
export type SaveReviewInput = z.infer<typeof saveReviewInputSchema>;

export const reviewQuerySchema = z.object({
  /** Qualquer dia do período desejado. Padrão: hoje. */
  date: dateSchema.optional(),
});
export type ReviewQuery = z.infer<typeof reviewQuerySchema>;
