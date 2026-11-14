import { z } from 'zod';
import { dateTimeSchema, idSchema } from './common';

export const PASSWORD_MIN_LENGTH = 8;

export const userSchema = z.object({
  id: idSchema,
  name: z.string(),
  email: z.email(),
  timezone: z.string(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  /** Minutes the user considers a realistic amount of planned work for one day. */
  dailyCapacityMinutes: z.number().int().positive(),
  createdAt: dateTimeSchema,
});
export type User = z.infer<typeof userSchema>;

export const loginInputSchema = z.object({
  email: z.email('Informe um e-mail válido'),
  password: z.string().min(1, 'Informe sua senha'),
});
export type LoginInput = z.infer<typeof loginInputSchema>;

export const registerInputSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(80),
  email: z.email('Informe um e-mail válido'),
  password: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(128),
});
export type RegisterInput = z.infer<typeof registerInputSchema>;

/** Returned by login, register and refresh. The refresh token travels in an httpOnly cookie. */
export const authSessionSchema = z.object({
  accessToken: z.string(),
  user: userSchema,
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const updateProfileInputSchema = z.object({
  name: z.string().trim().min(2, 'Informe seu nome').max(80).optional(),
  timezone: z.string().min(1).max(64).optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
  dailyCapacityMinutes: z
    .number()
    .int()
    .min(30)
    .max(24 * 60)
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

export const changePasswordInputSchema = z.object({
  currentPassword: z.string().min(1, 'Informe a senha atual'),
  newPassword: z
    .string()
    .min(PASSWORD_MIN_LENGTH, `A senha precisa ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`)
    .max(128),
});
export type ChangePasswordInput = z.infer<typeof changePasswordInputSchema>;

export const deleteAccountInputSchema = z.object({
  password: z.string().min(1, 'Informe sua senha para confirmar'),
});
export type DeleteAccountInput = z.infer<typeof deleteAccountInputSchema>;
