import { z } from 'zod';

export const insightKindSchema = z.enum([
  'goal_stalled',
  'goal_deadline_risk',
  'day_overloaded',
  'habit_drop',
  'habit_streak',
  'overdue_pile',
  'budget_risk',
  'reserve_projection',
]);
export type InsightKind = z.infer<typeof insightKindSchema>;

/**
 * Um insight sempre carrega a evidência numérica que o produziu: nenhum aparece sem dado
 * suficiente e todos são reproduzíveis a partir do que o usuário registrou.
 */
export const insightSchema = z.object({
  id: z.string(),
  kind: insightKindSchema,
  tone: z.enum(['positive', 'neutral', 'attention']),
  title: z.string(),
  message: z.string(),
  evidence: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  /** Rota do app relacionada. */
  link: z.string().nullable(),
});
export type Insight = z.infer<typeof insightSchema>;
