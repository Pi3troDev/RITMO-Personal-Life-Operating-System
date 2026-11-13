import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common';

export const CAPTURE_KINDS = ['task', 'idea', 'event', 'expense', 'note', 'goal'] as const;
export const captureKindSchema = z.enum(CAPTURE_KINDS);
export type CaptureKind = z.infer<typeof captureKindSchema>;

export const CAPTURE_KIND_LABELS: Record<CaptureKind, string> = {
  task: 'Tarefa',
  idea: 'Ideia',
  event: 'Compromisso',
  expense: 'Despesa',
  note: 'Anotação',
  goal: 'Objetivo',
};

/** Something captured in a hurry, waiting to be classified into a real item. */
export const inboxItemSchema = z.object({
  id: idSchema,
  kind: captureKindSchema,
  text: z.string(),
  createdAt: dateTimeSchema,
  processedAt: dateTimeSchema.nullable(),
});
export type InboxItem = z.infer<typeof inboxItemSchema>;

export const createCaptureInputSchema = z.object({
  kind: captureKindSchema,
  text: z.string().trim().min(1, 'Escreva algo para capturar').max(500),
});
export type CreateCaptureInput = z.infer<typeof createCaptureInputSchema>;

/**
 * A captured task becomes a real task right away (in "A fazer", no date).
 * Every other kind lands in the inbox to be completed later.
 */
export const captureResultSchema = z.discriminatedUnion('destination', [
  z.object({ destination: z.literal('task'), taskId: idSchema }),
  z.object({ destination: z.literal('inbox'), item: inboxItemSchema }),
]);
export type CaptureResult = z.infer<typeof captureResultSchema>;
