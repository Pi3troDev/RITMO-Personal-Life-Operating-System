import { z } from 'zod';
import { dateSchema, dateTimeSchema, idSchema, timeSchema } from './common';

export const habitTargetTypeSchema = z.enum(['check', 'duration', 'quantity']);
export type HabitTargetType = z.infer<typeof habitTargetTypeSchema>;

export const habitStatusSchema = z.enum(['active', 'paused', 'archived']);
export type HabitStatus = z.infer<typeof habitStatusSchema>;

/**
 * `done`    — the habit was performed.
 * `skipped` — an exceptional day (travel, illness…). It neither counts as done nor breaks a streak.
 * A scheduled day without a check-in is simply "not registered"; it is never stored as a failure.
 */
export const habitCheckinStatusSchema = z.enum(['done', 'skipped']);
export type HabitCheckinStatus = z.infer<typeof habitCheckinStatusSchema>;

export const habitCheckinSchema = z.object({
  habitId: idSchema,
  date: dateSchema,
  status: habitCheckinStatusSchema,
  /** Minutes or quantity, according to the habit's target type. */
  value: z.number().nonnegative().nullable(),
  note: z.string().nullable(),
});
export type HabitCheckin = z.infer<typeof habitCheckinSchema>;

export const habitSchema = z.object({
  id: idSchema,
  name: z.string(),
  areaId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  /** Days of the week the habit is scheduled for: 0 = Sunday … 6 = Saturday. */
  weekdays: z.array(z.number().int().min(0).max(6)),
  suggestedTime: timeSchema.nullable(),
  targetType: habitTargetTypeSchema,
  targetValue: z.number().positive().nullable(),
  targetUnit: z.string().nullable(),
  notes: z.string().nullable(),
  status: habitStatusSchema,
  createdAt: dateTimeSchema,
  /** Computed by the server. */
  stats: z.object({
    currentStreak: z.number().int().nonnegative(),
    bestStreak: z.number().int().nonnegative(),
    /** Share of scheduled days done over the last 30 days, 0–1. Skipped days are excluded. */
    rate30d: z.number().min(0).max(1),
  }),
});
export type Habit = z.infer<typeof habitSchema>;

export const createHabitInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao hábito').max(80),
  areaId: idSchema.nullish(),
  goalId: idSchema.nullish(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1, 'Escolha pelo menos um dia'),
  suggestedTime: timeSchema.nullish(),
  targetType: habitTargetTypeSchema.optional(),
  targetValue: z.number().positive().nullish(),
  targetUnit: z.string().max(20).nullish(),
  notes: z.string().max(2000).nullish(),
});
export type CreateHabitInput = z.infer<typeof createHabitInputSchema>;

export const updateHabitInputSchema = createHabitInputSchema.partial().extend({
  status: habitStatusSchema.optional(),
});
export type UpdateHabitInput = z.infer<typeof updateHabitInputSchema>;

export const upsertCheckinInputSchema = z.object({
  status: habitCheckinStatusSchema,
  value: z.number().nonnegative().nullish(),
  note: z.string().max(500).nullish(),
});
export type UpsertCheckinInput = z.infer<typeof upsertCheckinInputSchema>;
