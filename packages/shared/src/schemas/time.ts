import { z } from 'zod';
import { dateSchema, dateTimeSchema, idSchema } from './common';

export const TIME_ENTRY_KINDS = [
  'task',
  'study',
  'dev',
  'english',
  'workout',
  'reading',
  'spiritual',
  'other',
] as const;
export const timeEntryKindSchema = z.enum(TIME_ENTRY_KINDS);
export type TimeEntryKind = z.infer<typeof timeEntryKindSchema>;

export const timerStateSchema = z.enum(['running', 'paused', 'stopped']);
export type TimerState = z.infer<typeof timerStateSchema>;

export const timeEntrySchema = z.object({
  id: idSchema,
  kind: timeEntryKindSchema,
  source: z.enum(['timer', 'manual']),
  timerState: timerStateSchema,
  title: z.string().nullable(),
  notes: z.string().nullable(),
  startedAt: dateTimeSchema,
  endedAt: dateTimeSchema.nullable(),
  /** Dia (no fuso do usuário) em que começou. */
  date: dateSchema,
  /** Tempo ativo até agora (para um cronômetro rodando, já inclui o trecho corrente). */
  durationSeconds: z.number().int().nonnegative(),
  areaId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  projectId: idSchema.nullable(),
  taskId: idSchema.nullable(),
  eventId: idSchema.nullable(),
  habitId: idSchema.nullable(),
  studyTrackId: idSchema.nullable(),
  lessonId: idSchema.nullable(),
  bookId: idSchema.nullable(),
  /** Só para `kind = english`. */
  englishSkill: z.enum(['listening', 'reading', 'speaking', 'writing']).nullable(),
});
export type TimeEntry = z.infer<typeof timeEntrySchema>;

const timeContext = {
  title: z.string().trim().max(200).nullish(),
  notes: z.string().max(5000).nullish(),
  areaId: idSchema.nullish(),
  goalId: idSchema.nullish(),
  projectId: idSchema.nullish(),
  taskId: idSchema.nullish(),
  eventId: idSchema.nullish(),
  habitId: idSchema.nullish(),
  studyTrackId: idSchema.nullish(),
  lessonId: idSchema.nullish(),
  bookId: idSchema.nullish(),
  englishSkill: z.enum(['listening', 'reading', 'speaking', 'writing']).nullish(),
};

/** Inicia um cronômetro. Área/objetivo/projeto são copiados do item de origem quando não informados. */
export const startTimerInputSchema = z.object({
  kind: timeEntryKindSchema.optional(),
  ...timeContext,
});
export type StartTimerInput = z.infer<typeof startTimerInputSchema>;

/** Lançamento manual de tempo já gasto. */
export const createManualEntryInputSchema = z.object({
  kind: timeEntryKindSchema.optional(),
  minutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60),
  /** Dia em que o tempo foi gasto. Padrão: hoje. */
  date: dateSchema.optional(),
  ...timeContext,
});
export type CreateManualEntryInput = z.infer<typeof createManualEntryInputSchema>;

export const updateTimeEntryInputSchema = z.object({
  title: z.string().trim().max(200).nullish(),
  notes: z.string().max(5000).nullish(),
  kind: timeEntryKindSchema.optional(),
  minutes: z
    .number()
    .int()
    .positive()
    .max(24 * 60)
    .optional(),
  areaId: idSchema.nullish(),
  goalId: idSchema.nullish(),
  projectId: idSchema.nullish(),
});
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntryInputSchema>;

export const listTimeEntriesQuerySchema = z.object({
  from: dateSchema.optional(),
  to: dateSchema.optional(),
  taskId: idSchema.optional(),
  goalId: idSchema.optional(),
  areaId: idSchema.optional(),
});
export type ListTimeEntriesQuery = z.infer<typeof listTimeEntriesQuerySchema>;

export const englishSkillSchema = z.enum(['listening', 'reading', 'speaking', 'writing']);
export type EnglishSkill = z.infer<typeof englishSkillSchema>;
export const ENGLISH_SKILL_LABELS: Record<EnglishSkill, string> = {
  listening: 'Listening',
  reading: 'Reading',
  speaking: 'Speaking',
  writing: 'Writing',
};
