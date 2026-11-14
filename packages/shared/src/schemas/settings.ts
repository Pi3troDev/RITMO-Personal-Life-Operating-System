import { z } from 'zod';

/** Módulos que o usuário pode ligar ou desligar. "Meu Dia" e captura rápida ficam sempre ativos. */
export const MODULE_KEYS = [
  'agenda',
  'tasks',
  'projects',
  'goals',
  'habits',
  'finance',
  'reviews',
  'insights',
] as const;
export const moduleKeySchema = z.enum(MODULE_KEYS);
export type ModuleKey = z.infer<typeof moduleKeySchema>;

export const themeSchema = z.enum(['dark', 'light', 'system']);
export type Theme = z.infer<typeof themeSchema>;

export const userSettingsSchema = z.object({
  timezone: z.string(),
  locale: z.string(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]),
  theme: themeSchema,
  currency: z.string().length(3),
  dailyCapacityMinutes: z.number().int().positive(),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const updateSettingsInputSchema = z.object({
  timezone: z.string().min(1).max(64).optional(),
  locale: z.string().min(2).max(10).optional(),
  weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
  theme: themeSchema.optional(),
  currency: z.string().length(3).optional(),
  dailyCapacityMinutes: z
    .number()
    .int()
    .min(30)
    .max(24 * 60)
    .optional(),
});
export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;

export const moduleStateSchema = z.object({ key: moduleKeySchema, enabled: z.boolean() });
export type ModuleState = z.infer<typeof moduleStateSchema>;

export const updateModulesInputSchema = z.object({
  modules: z.array(moduleStateSchema).min(1),
});
export type UpdateModulesInput = z.infer<typeof updateModulesInputSchema>;
