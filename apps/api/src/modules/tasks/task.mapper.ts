import type { ChecklistItem, Task as TaskDto, Board as BoardDto } from '@ritmo/shared';
import type { Board, BoardColumn, Task } from '../../generated/prisma/client';
import { dateToDay } from '../../core/time';

export function toTaskDto(t: Task): TaskDto {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    status: t.status,
    priority: t.priority,
    areaId: t.areaId,
    projectId: t.projectId,
    goalId: t.goalId,
    boardId: t.boardId,
    columnId: t.columnId,
    position: t.position,
    dueDate: t.dueDate ? dateToDay(t.dueDate) : null,
    scheduledStart: t.scheduledStart?.toISOString() ?? null,
    estimateMinutes: t.estimateMinutes,
    spentMinutes: t.spentMinutes,
    tags: (t.tags as string[] | null) ?? [],
    checklist: (t.checklist as ChecklistItem[] | null) ?? [],
    recurrence: t.recurrence,
    notes: t.notes,
    completedAt: t.completedAt?.toISOString() ?? null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export function toBoardDto(board: Board & { columns: BoardColumn[] }): BoardDto {
  return {
    id: board.id,
    name: board.name,
    isDefault: board.isDefault,
    columns: [...board.columns]
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        id: c.id,
        boardId: c.boardId,
        name: c.name,
        statusCategory: c.statusCategory,
        position: c.position,
      })),
  };
}
