import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common';

export const eventSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  areaId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  start: dateTimeSchema,
  end: dateTimeSchema,
  allDay: z.boolean(),
  location: z.string().nullable(),
  /** RFC 5545 RRULE. */
  recurrence: z.string().nullable(),
  /** Minutes before `start` to remind the user; null = no reminder. */
  reminderMinutes: z.number().int().nonnegative().nullable(),
  status: z.enum(['scheduled', 'done', 'cancelled']),
  createdAt: dateTimeSchema,
});
export type CalendarEvent = z.infer<typeof eventSchema>;

export const createEventInputSchema = z
  .object({
    title: z.string().trim().min(1, 'Dê um título ao compromisso').max(200),
    description: z.string().max(5000).nullish(),
    areaId: idSchema.nullish(),
    goalId: idSchema.nullish(),
    start: dateTimeSchema,
    end: dateTimeSchema,
    allDay: z.boolean().optional(),
    location: z.string().max(200).nullish(),
    recurrence: z.string().nullish(),
    reminderMinutes: z.number().int().nonnegative().nullish(),
  })
  .refine((v) => v.end > v.start, {
    message: 'O término precisa ser depois do início',
    path: ['end'],
  });
export type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const updateEventInputSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(5000).nullish(),
  areaId: idSchema.nullish(),
  goalId: idSchema.nullish(),
  start: dateTimeSchema.optional(),
  end: dateTimeSchema.optional(),
  allDay: z.boolean().optional(),
  location: z.string().max(200).nullish(),
  recurrence: z.string().nullish(),
  reminderMinutes: z.number().int().nonnegative().nullish(),
  status: z.enum(['scheduled', 'done', 'cancelled']).optional(),
});
export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;
