import {
  createTaskInputSchema,
  idSchema,
  listTasksQuerySchema,
  taskSchema,
  updateTaskInputSchema,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { notFound } from '../../core/errors';
import { userClock } from '../../core/ownership';
import { route, type AnyRoute } from '../../core/http/route';
import { dayToDate, dayRange } from '../../core/time';
import type { Prisma } from '../../generated/prisma/client';
import { toTaskDto } from './task.mapper';
import type { TasksService } from './tasks.service';

export function tasksRoutes({ db }: Deps, service: TasksService): AnyRoute[] {
  const idParams = z.object({ id: idSchema });

  return [
    route({
      method: 'get',
      path: '/tasks',
      tag: 'Tarefas',
      summary: 'Listar tarefas',
      description:
        'Visões: `all`, `today` (vencem ou têm bloco hoje), `upcoming` (vencem depois de hoje), `overdue` (venceram e continuam abertas), `done`. ' +
        '"Hoje" é o dia no fuso do usuário.',
      query: listTasksQuerySchema,
      response: z.array(taskSchema),
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        const open: Prisma.TaskWhereInput = { status: { not: 'done' } };
        const today = dayRange(user.today, user.timezone);

        const byView: Record<string, Prisma.TaskWhereInput> = {
          all: {},
          today: {
            ...open,
            OR: [
              { dueDate: dayToDate(user.today) },
              { scheduledStart: { gte: today.start, lt: today.end } },
            ],
          },
          upcoming: { ...open, dueDate: { gt: dayToDate(user.today) } },
          overdue: { ...open, dueDate: { lt: dayToDate(user.today) } },
          done: { status: 'done' },
        };

        const tasks = await db.task.findMany({
          where: {
            userId,
            ...byView[query.view ?? 'all'],
            ...(query.projectId ? { projectId: query.projectId } : {}),
            ...(query.goalId ? { goalId: query.goalId } : {}),
            ...(query.areaId ? { areaId: query.areaId } : {}),
            ...(query.boardId ? { boardId: query.boardId } : {}),
            ...(query.q ? { title: { contains: query.q } } : {}),
          },
          orderBy: query.view === 'done' ? { completedAt: 'desc' } : { position: 'asc' },
        });
        return tasks.map(toTaskDto);
      },
    }),

    route({
      method: 'get',
      path: '/tasks/:id',
      tag: 'Tarefas',
      summary: 'Buscar tarefa',
      params: idParams,
      response: taskSchema,
      async handler({ userId, params }) {
        const task = await db.task.findFirst({ where: { id: params.id, userId } });
        if (!task) throw notFound();
        return toTaskDto(task);
      },
    }),

    route({
      method: 'post',
      path: '/tasks',
      tag: 'Tarefas',
      summary: 'Criar tarefa',
      description: 'Sem `columnId`, a tarefa entra em "A fazer" do quadro padrão.',
      body: createTaskInputSchema,
      response: taskSchema,
      async handler({ userId, body }) {
        return toTaskDto(await service.create(userId, body));
      },
    }),

    route({
      method: 'patch',
      path: '/tasks/:id',
      tag: 'Tarefas',
      summary: 'Atualizar, mover ou concluir tarefa',
      description:
        'Mover para uma coluna (`columnId`) ou trocar `status` muda o status junto; concluir define `completedAt`. ' +
        'Concluir uma tarefa recorrente cria a próxima ocorrência. `position` reordena dentro da coluna.',
      params: idParams,
      body: updateTaskInputSchema,
      response: taskSchema,
      async handler({ userId, params, body }) {
        return toTaskDto(await service.update(userId, params.id, body));
      },
    }),

    route({
      method: 'delete',
      path: '/tasks/:id',
      tag: 'Tarefas',
      summary: 'Excluir tarefa',
      description: 'O tempo já registrado nela continua no histórico (sem vínculo com a tarefa).',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.task.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),
  ];
}
