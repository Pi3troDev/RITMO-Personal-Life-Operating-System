import { z } from 'zod';
import { dateSchema, dateTimeSchema, idSchema } from './common';

export const TASK_STATUSES = ['backlog', 'todo', 'in_progress', 'in_review', 'done'] as const;
export const taskStatusSchema = z.enum(TASK_STATUSES);
export type TaskStatus = z.infer<typeof taskStatusSchema>;

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'A fazer',
  in_progress: 'Em andamento',
  in_review: 'Em revisão',
  done: 'Concluído',
};

export const TASK_PRIORITIES = ['none', 'low', 'medium', 'high', 'urgent'] as const;
export const taskPrioritySchema = z.enum(TASK_PRIORITIES);
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  none: 'Sem prioridade',
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  urgent: 'Urgente',
};

export const checklistItemSchema = z.object({
  id: idSchema,
  title: z.string(),
  done: z.boolean(),
});
export type ChecklistItem = z.infer<typeof checklistItemSchema>;

export const taskSchema = z.object({
  id: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  /** Always equal to the status category of the column the task sits in. */
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  areaId: idSchema.nullable(),
  projectId: idSchema.nullable(),
  goalId: idSchema.nullable(),
  boardId: idSchema,
  columnId: idSchema,
  /** Sort key inside the column (ascending). */
  position: z.number(),
  dueDate: dateSchema.nullable(),
  /** When set, the task has a time block on the agenda. */
  scheduledStart: dateTimeSchema.nullable(),
  estimateMinutes: z.number().int().positive().nullable(),
  spentMinutes: z.number().int().nonnegative(),
  tags: z.array(z.string()),
  checklist: z.array(checklistItemSchema),
  /** RFC 5545 RRULE, e.g. `FREQ=WEEKLY;BYDAY=MO,WE`. */
  recurrence: z.string().nullable(),
  notes: z.string().nullable(),
  completedAt: dateTimeSchema.nullable(),
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});
export type Task = z.infer<typeof taskSchema>;

export const createTaskInputSchema = z.object({
  title: z.string().trim().min(1, 'Dê um título à tarefa').max(200),
  description: z.string().max(5000).nullish(),
  priority: taskPrioritySchema.optional(),
  areaId: idSchema.nullish(),
  projectId: idSchema.nullish(),
  goalId: idSchema.nullish(),
  /** Defaults to the "A fazer" column of the default board. */
  columnId: idSchema.optional(),
  dueDate: dateSchema.nullish(),
  scheduledStart: dateTimeSchema.nullish(),
  estimateMinutes: z.number().int().positive().max(24 * 60).nullish(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  checklist: z.array(z.object({ title: z.string().trim().min(1).max(200) })).optional(),
  recurrence: z.string().nullish(),
  notes: z.string().max(5000).nullish(),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

export const updateTaskInputSchema = createTaskInputSchema
  .omit({ checklist: true })
  .partial()
  .extend({
    /** Moves the task to the first column with this status category on its board. */
    status: taskStatusSchema.optional(),
    position: z.number().optional(),
    spentMinutes: z.number().int().nonnegative().optional(),
    checklist: z.array(checklistItemSchema).optional(),
  });
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;

/** Views offered by `GET /tasks?view=`. */
export const TASK_VIEWS = ['all', 'today', 'upcoming', 'overdue', 'done'] as const;
export const taskViewSchema = z.enum(TASK_VIEWS);
export type TaskView = z.infer<typeof taskViewSchema>;

export const boardColumnSchema = z.object({
  id: idSchema,
  boardId: idSchema,
  name: z.string(),
  statusCategory: taskStatusSchema,
  position: z.number(),
});
export type BoardColumn = z.infer<typeof boardColumnSchema>;

export const boardSchema = z.object({
  id: idSchema,
  name: z.string(),
  isDefault: z.boolean(),
  columns: z.array(boardColumnSchema),
});
export type Board = z.infer<typeof boardSchema>;

export const createBoardInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome ao quadro').max(60),
});
export type CreateBoardInput = z.infer<typeof createBoardInputSchema>;

export const createColumnInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome à coluna').max(40),
  statusCategory: taskStatusSchema,
});
export type CreateColumnInput = z.infer<typeof createColumnInputSchema>;
