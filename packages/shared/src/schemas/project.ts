import { z } from 'zod';
import { dateSchema, dateTimeSchema, idSchema } from './common';

export const PROJECT_STATUSES = ['active', 'paused', 'completed', 'archived'] as const;
export const projectStatusSchema = z.enum(PROJECT_STATUSES);
export type ProjectStatus = z.infer<typeof projectStatusSchema>;

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  completed: 'Concluído',
  archived: 'Arquivado',
};

export const projectSchema = z.object({
  id: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  areaId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  status: projectStatusSchema,
  dueDate: dateSchema.nullable(),
  /** Computed from the project's tasks. */
  openTaskCount: z.number().int().nonnegative(),
  doneTaskCount: z.number().int().nonnegative(),
  /** 0–100: done tasks ÷ all tasks. */
  progress: z.number().min(0).max(100),
  createdAt: dateTimeSchema,
});
export type Project = z.infer<typeof projectSchema>;

export const createProjectInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao projeto').max(100),
  description: z.string().max(2000).nullish(),
  areaId: idSchema.nullish(),
  goalId: idSchema.nullish(),
  dueDate: dateSchema.nullish(),
});
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;

export const updateProjectInputSchema = createProjectInputSchema.partial().extend({
  status: projectStatusSchema.optional(),
});
export type UpdateProjectInput = z.infer<typeof updateProjectInputSchema>;
