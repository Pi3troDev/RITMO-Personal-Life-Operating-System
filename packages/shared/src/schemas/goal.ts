import { z } from 'zod';
import { dateSchema, dateTimeSchema, idSchema } from './common';

export const GOAL_CATEGORIES = [
  'financial',
  'professional',
  'academic',
  'intellectual',
  'health',
  'spiritual',
  'personal',
  'relationships',
] as const;
export const goalCategorySchema = z.enum(GOAL_CATEGORIES);
export type GoalCategory = z.infer<typeof goalCategorySchema>;

export const GOAL_CATEGORY_LABELS: Record<GoalCategory, string> = {
  financial: 'Financeiro',
  professional: 'Profissional',
  academic: 'Acadêmico',
  intellectual: 'Intelectual',
  health: 'Saúde',
  spiritual: 'Espiritual',
  personal: 'Pessoal',
  relationships: 'Relacionamentos',
};

export const goalStatusSchema = z.enum(['active', 'paused', 'completed', 'archived']);
export type GoalStatus = z.infer<typeof goalStatusSchema>;

/**
 * How `progress` is obtained:
 * `manual`     — the user sets the percentage.
 * `milestones` — share of milestones completed.
 * `metric`     — `metric.current / metric.target` (money in a reserve, hours logged, check-ins).
 */
export const goalProgressModeSchema = z.enum(['manual', 'milestones', 'metric']);
export type GoalProgressMode = z.infer<typeof goalProgressModeSchema>;

export const goalMetricSchema = z.object({
  kind: z.enum(['money', 'hours', 'count']),
  /** Money in centavos; hours as a decimal number; count as an integer. */
  current: z.number().nonnegative(),
  target: z.number().positive(),
  unit: z.string(),
});
export type GoalMetric = z.infer<typeof goalMetricSchema>;

export const milestoneSchema = z.object({
  id: idSchema,
  title: z.string(),
  done: z.boolean(),
  dueDate: dateSchema.nullable(),
  completedAt: dateTimeSchema.nullable(),
  position: z.number(),
});
export type Milestone = z.infer<typeof milestoneSchema>;

export const goalSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  category: goalCategorySchema,
  areaId: idSchema.nullable(),
  status: goalStatusSchema,
  startDate: dateSchema,
  targetDate: dateSchema.nullable(),
  progressMode: goalProgressModeSchema,
  /** 0–100, computed by the server according to `progressMode`. */
  progress: z.number().min(0).max(100),
  metric: goalMetricSchema.nullable(),
  /** Reserve account whose balance feeds a `money` metric. */
  linkedAccountId: idSchema.nullable(),
  milestones: z.array(milestoneSchema),
  habitIds: z.array(idSchema),
  openTaskCount: z.number().int().nonnegative(),
  doneTaskCount: z.number().int().nonnegative(),
  /** Last time anything linked to the goal moved (task, check-in, milestone, contribution). */
  lastActivityAt: dateTimeSchema.nullable(),
  /** Progress snapshots, oldest first, for the evolution chart. */
  history: z.array(z.object({ date: dateSchema, progress: z.number().min(0).max(100) })),
  createdAt: dateTimeSchema,
});
export type Goal = z.infer<typeof goalSchema>;

export const createGoalInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao objetivo').max(120),
  description: z.string().max(5000).nullish(),
  category: goalCategorySchema,
  areaId: idSchema.nullish(),
  startDate: dateSchema.optional(),
  targetDate: dateSchema.nullish(),
  progressMode: goalProgressModeSchema.optional(),
  metric: goalMetricSchema.pick({ kind: true, target: true, unit: true }).nullish(),
  linkedAccountId: idSchema.nullish(),
  milestones: z.array(z.object({ title: z.string().trim().min(1).max(200) })).optional(),
  habitIds: z.array(idSchema).optional(),
});
export type CreateGoalInput = z.infer<typeof createGoalInputSchema>;

export const updateGoalInputSchema = createGoalInputSchema
  .omit({ milestones: true })
  .partial()
  .extend({
    status: goalStatusSchema.optional(),
    /** Only honoured when `progressMode` is `manual`. */
    progress: z.number().min(0).max(100).optional(),
  });
export type UpdateGoalInput = z.infer<typeof updateGoalInputSchema>;

export const createMilestoneInputSchema = z.object({
  title: z.string().trim().min(1, 'Descreva o marco').max(200),
  dueDate: dateSchema.nullish(),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneInputSchema>;

export const updateMilestoneInputSchema = createMilestoneInputSchema.partial().extend({
  done: z.boolean().optional(),
});
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneInputSchema>;

/** "Visão 2027": the main results the user wants from a given year. */
export const visionItemSchema = z.object({
  id: idSchema,
  year: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  category: goalCategorySchema,
  goalId: idSchema.nullable(),
  achieved: z.boolean(),
  position: z.number(),
});
export type VisionItem = z.infer<typeof visionItemSchema>;

export const createVisionItemInputSchema = z.object({
  year: z.number().int().min(2000).max(2100),
  title: z.string().trim().min(1, 'Descreva o resultado').max(160),
  description: z.string().max(2000).nullish(),
  category: goalCategorySchema,
  goalId: idSchema.nullish(),
});
export type CreateVisionItemInput = z.infer<typeof createVisionItemInputSchema>;

export const updateVisionItemInputSchema = createVisionItemInputSchema.partial().extend({
  achieved: z.boolean().optional(),
});
export type UpdateVisionItemInput = z.infer<typeof updateVisionItemInputSchema>;
