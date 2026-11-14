import { z } from 'zod';
import { dateSchema, idSchema } from './common';

export const timeReportQuerySchema = z.object({
  from: dateSchema,
  to: dateSchema,
  groupBy: z.enum(['area', 'kind', 'goal', 'project', 'day']).default('area'),
});
export type TimeReportQuery = z.infer<typeof timeReportQuerySchema>;

export const timeReportSchema = z.object({
  from: dateSchema,
  to: dateSchema,
  totalMinutes: z.number().int(),
  groups: z.array(
    z.object({
      key: z.string().nullable(),
      id: idSchema.nullable(),
      label: z.string(),
      minutes: z.number().int(),
    }),
  ),
});
export type TimeReport = z.infer<typeof timeReportSchema>;

export const evolutionQuerySchema = z.object({
  weeks: z.coerce.number().int().min(1).max(26).default(8),
});
export type EvolutionQuery = z.infer<typeof evolutionQuerySchema>;

export const evolutionSchema = z.object({
  weeks: z.array(
    z.object({
      start: dateSchema,
      tasksCompleted: z.number().int(),
      trackedMinutes: z.number().int(),
      habitRate: z.number().min(0).max(1).nullable(),
      incomeCents: z.number().int(),
      expenseCents: z.number().int(),
    }),
  ),
});
export type Evolution = z.infer<typeof evolutionSchema>;
