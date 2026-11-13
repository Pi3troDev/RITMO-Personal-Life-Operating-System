import { z } from 'zod';

export const idSchema = z.string().min(1);

/** Calendar day in the user's timezone: `YYYY-MM-DD`. */
export const dateSchema = z.iso.date();

/** Instant in UTC: ISO 8601 with `Z`. */
export const dateTimeSchema = z.iso.datetime();

/** Calendar month: `YYYY-MM`. */
export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Mês inválido');

/** Time of day: `HH:mm`. */
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido');

/** Money in minor units (centavos). Always an integer. */
export const centsSchema = z.number().int();

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
