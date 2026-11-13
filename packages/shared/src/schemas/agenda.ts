import { z } from 'zod';
import { dateSchema, dateTimeSchema, idSchema } from './common';

/**
 * One block on the agenda: an occurrence of an event (fixed time) or a task that was given a
 * time block (flexible). Recurring events are expanded by the server for the requested range.
 */
export const agendaItemSchema = z.object({
  /** `${kind}:${refId}:${start}` — unique per occurrence. */
  id: z.string(),
  kind: z.enum(['event', 'task']),
  refId: idSchema,
  title: z.string(),
  areaId: idSchema.nullable(),
  start: dateTimeSchema,
  end: dateTimeSchema,
  allDay: z.boolean(),
  status: z.enum(['scheduled', 'done', 'cancelled']),
  /** True when the event belongs to a recurring series. */
  recurring: z.boolean(),
  /** True when this block overlaps another non-cancelled block. Computed by the server. */
  conflict: z.boolean(),
  // Event-only details, needed to edit the event.
  recurrence: z.string().nullable(),
  location: z.string().nullable(),
  reminderMinutes: z.number().int().nullable(),
});
export type AgendaItem = z.infer<typeof agendaItemSchema>;

export const agendaQuerySchema = z.object({
  /** First day of the range, inclusive. */
  from: dateSchema,
  /** Last day of the range, inclusive. */
  to: dateSchema,
});
export type AgendaQuery = z.infer<typeof agendaQuerySchema>;

/** Recurrence presets offered in the interface, as RFC 5545 RRULEs (`null` = does not repeat). */
export const RECURRENCE_PRESETS = {
  none: null,
  daily: 'FREQ=DAILY',
  weekdays: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR',
  weekly: 'FREQ=WEEKLY',
} as const;
export type RecurrencePreset = keyof typeof RECURRENCE_PRESETS;

export const RECURRENCE_LABELS: Record<RecurrencePreset, string> = {
  none: 'Não repete',
  daily: 'Todos os dias',
  weekdays: 'Dias úteis',
  weekly: 'Toda semana',
};
