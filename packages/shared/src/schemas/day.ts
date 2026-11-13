import { z } from 'zod';
import { dateSchema, dateTimeSchema, idSchema } from './common';
import { taskPrioritySchema } from './task';

export const MAX_DAILY_FOCUS = 3;

export const dayItemKindSchema = z.enum(['event', 'task', 'habit']);
export type DayItemKind = z.infer<typeof dayItemKindSchema>;

/**
 * `pending` — still to do.
 * `done`    — completed.
 * `skipped` — exceptional day for a habit, or a cancelled event.
 */
export const dayItemStatusSchema = z.enum(['pending', 'done', 'skipped']);
export type DayItemStatus = z.infer<typeof dayItemStatusSchema>;

/** One row of the day: an event, a task due/scheduled today, or a habit scheduled today. */
export const dayItemSchema = z.object({
  /** `${kind}:${refId}` — unique within the day. */
  id: z.string(),
  kind: dayItemKindSchema,
  refId: idSchema,
  title: z.string(),
  areaId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  /** Null for flexible items without a time. */
  start: dateTimeSchema.nullable(),
  durationMinutes: z.number().int().positive().nullable(),
  status: dayItemStatusSchema,
  priority: taskPrioritySchema.nullable(),
  isFocus: z.boolean(),
  /** True for tasks whose due date is before the day being viewed. */
  overdue: z.boolean(),
});
export type DayItem = z.infer<typeof dayItemSchema>;

export const moodSchema = z.enum(['great', 'good', 'neutral', 'hard', 'very_hard']);
export type Mood = z.infer<typeof moodSchema>;

export const MOOD_LABELS: Record<Mood, string> = {
  great: 'Ótimo',
  good: 'Bom',
  neutral: 'Neutro',
  hard: 'Difícil',
  very_hard: 'Muito difícil',
};

export const reflectionSchema = z.object({
  date: dateSchema,
  accomplished: z.string(),
  pending: z.string(),
  learned: z.string(),
  improve: z.string(),
  mood: moodSchema.nullable(),
  updatedAt: dateTimeSchema,
});
export type Reflection = z.infer<typeof reflectionSchema>;

export const upsertReflectionInputSchema = z.object({
  accomplished: z.string().max(4000),
  pending: z.string().max(4000),
  learned: z.string().max(4000),
  improve: z.string().max(4000),
  mood: moodSchema.nullable(),
});
export type UpsertReflectionInput = z.infer<typeof upsertReflectionInputSchema>;

export const setFocusInputSchema = z.object({
  taskIds: z.array(idSchema).max(MAX_DAILY_FOCUS, `Escolha até ${MAX_DAILY_FOCUS} prioridades`),
});
export type SetFocusInput = z.infer<typeof setFocusInputSchema>;

export const dayOverviewSchema = z.object({
  date: dateSchema,
  focusTaskIds: z.array(idSchema),
  items: z.array(dayItemSchema),
  summary: z.object({
    eventsCount: z.number().int(),
    tasksPending: z.number().int(),
    tasksDone: z.number().int(),
    habitsScheduled: z.number().int(),
    habitsDone: z.number().int(),
    activeGoals: z.number().int(),
    /** Sum of the durations of everything planned for the day. */
    plannedMinutes: z.number().int(),
    /** Time actually logged on the day. */
    spentMinutes: z.number().int(),
    /** The user's realistic daily capacity (settings). */
    capacityMinutes: z.number().int(),
    /** Items done ÷ items planned, 0–1. Describes the day; it does not grade the person. */
    completionRate: z.number().min(0).max(1),
  }),
  reflection: reflectionSchema.nullable(),
});
export type DayOverview = z.infer<typeof dayOverviewSchema>;
