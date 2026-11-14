import {
  boardColumnSchema,
  boardSchema,
  createBoardInputSchema,
  createColumnInputSchema,
  idSchema,
  updateBoardInputSchema,
  updateColumnInputSchema,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { conflict, notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { DEFAULT_COLUMNS } from '../auth/seed';
import { toBoardDto } from './task.mapper';
import type { TasksService } from './tasks.service';

export function boardsRoutes({ db }: Deps, service: TasksService): AnyRoute[] {
  const boardParams = z.object({ id: idSchema });
  const columnParams = z.object({ boardId: idSchema, columnId: idSchema });

  async function loadBoard(userId: string, id: string) {
    const board = await db.board.findFirst({ where: { id, userId }, include: { columns: true } });
    if (!board) throw notFound();
    return board;
  }

  return [
    route({
      method: 'get',
      path: '/boards',
      tag: 'Quadros',
      summary: 'Listar quadros',
      response: z.array(boardSchema),
      async handler({ userId }) {
        await service.defaultBoard(userId);
        const boards = await db.board.findMany({
          where: { userId },
          include: { columns: true },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
        });
        return boards.map(toBoardDto);
      },
    }),

    route({
      method: 'get',
      path: '/boards/default',
      tag: 'Quadros',
      summary: 'Quadro padrão',
      response: boardSchema,
      async handler({ userId }) {
        return toBoardDto(await service.defaultBoard(userId));
      },
    }),

    route({
      method: 'post',
      path: '/boards',
      tag: 'Quadros',
      summary: 'Criar quadro',
      description: 'Nasce com as cinco colunas padrão (uma por categoria de status).',
      body: createBoardInputSchema,
      response: boardSchema,
      async handler({ userId, body }) {
        const board = await db.board.create({
          data: {
            userId,
            name: body.name,
            columns: {
              create: DEFAULT_COLUMNS.map((c, i) => ({
                userId,
                name: c.name,
                statusCategory: c.statusCategory,
                position: (i + 1) * 1000,
              })),
            },
          },
          include: { columns: true },
        });
        return toBoardDto(board);
      },
    }),

    route({
      method: 'patch',
      path: '/boards/:id',
      tag: 'Quadros',
      summary: 'Renomear quadro',
      params: boardParams,
      body: updateBoardInputSchema,
      response: boardSchema,
      async handler({ userId, params, body }) {
        await loadBoard(userId, params.id);
        const board = await db.board.update({
          where: { id: params.id },
          data: { name: body.name },
          include: { columns: true },
        });
        return toBoardDto(board);
      },
    }),

    route({
      method: 'delete',
      path: '/boards/:id',
      tag: 'Quadros',
      summary: 'Excluir quadro',
      description:
        'O quadro padrão não pode ser excluído. Se houver tarefas, é preciso confirmar com `deleteTasks=true` (as tarefas são apagadas).',
      params: boardParams,
      query: z.object({ deleteTasks: z.stringbool().optional() }),
      async handler({ userId, params, query }) {
        const board = await loadBoard(userId, params.id);
        if (board.isDefault) throw conflict('O quadro padrão não pode ser excluído.');
        const tasks = await db.task.count({ where: { boardId: board.id } });
        if (tasks > 0 && !query.deleteTasks) {
          throw conflict(`Este quadro tem ${tasks} tarefa(s). Confirme para excluí-las junto.`, {
            tasks,
          });
        }
        await db.board.delete({ where: { id: board.id } });
      },
    }),

    route({
      method: 'post',
      path: '/boards/:id/columns',
      tag: 'Quadros',
      summary: 'Criar coluna',
      params: boardParams,
      body: createColumnInputSchema,
      response: boardColumnSchema,
      async handler({ userId, params, body }) {
        const board = await loadBoard(userId, params.id);
        const last = await db.boardColumn.aggregate({
          where: { boardId: board.id },
          _max: { position: true },
        });
        const column = await db.boardColumn.create({
          data: {
            userId,
            boardId: board.id,
            name: body.name,
            statusCategory: body.statusCategory,
            position: (last._max.position ?? 0) + 1000,
          },
        });
        return {
          id: column.id,
          boardId: column.boardId,
          name: column.name,
          statusCategory: column.statusCategory,
          position: column.position,
        };
      },
    }),

    route({
      method: 'patch',
      path: '/boards/:boardId/columns/:columnId',
      tag: 'Quadros',
      summary: 'Renomear ou reordenar coluna',
      params: columnParams,
      body: updateColumnInputSchema,
      response: boardColumnSchema,
      async handler({ userId, params, body }) {
        const found = await db.boardColumn.findFirst({
          where: { id: params.columnId, boardId: params.boardId, userId },
        });
        if (!found) throw notFound();
        const column = await db.boardColumn.update({ where: { id: found.id }, data: body });
        return {
          id: column.id,
          boardId: column.boardId,
          name: column.name,
          statusCategory: column.statusCategory,
          position: column.position,
        };
      },
    }),

    route({
      method: 'delete',
      path: '/boards/:boardId/columns/:columnId',
      tag: 'Quadros',
      summary: 'Excluir coluna',
      description:
        'Se a coluna tiver tarefas, informe `moveTo` (outra coluna do mesmo quadro) para movê-las; o status das tarefas passa ' +
        'a ser o da coluna de destino. Não é possível excluir a última coluna de uma categoria de status.',
      params: columnParams,
      query: z.object({ moveTo: idSchema.optional() }),
      async handler({ userId, params, query }) {
        const column = await db.boardColumn.findFirst({
          where: { id: params.columnId, boardId: params.boardId, userId },
        });
        if (!column) throw notFound();

        const sameStatus = await db.boardColumn.count({
          where: { boardId: column.boardId, statusCategory: column.statusCategory },
        });
        if (sameStatus === 1) {
          throw conflict('Cada status precisa de pelo menos uma coluna no quadro.');
        }

        const tasks = await db.task.count({ where: { columnId: column.id } });
        if (tasks > 0) {
          if (!query.moveTo) {
            throw conflict(`A coluna tem ${tasks} tarefa(s). Escolha para onde movê-las.`, {
              tasks,
            });
          }
          const destination = await db.boardColumn.findFirst({
            where: { id: query.moveTo, boardId: column.boardId, userId },
          });
          if (!destination || destination.id === column.id)
            throw conflict('Coluna de destino inválida.');
          const base = await service.nextPosition(destination.id);
          const moving = await db.task.findMany({
            where: { columnId: column.id },
            orderBy: { position: 'asc' },
            select: { id: true, completedAt: true },
          });
          await db.$transaction(
            moving.map((task, index) =>
              db.task.update({
                where: { id: task.id },
                data: {
                  columnId: destination.id,
                  status: destination.statusCategory,
                  position: base + index * 1000,
                  completedAt:
                    destination.statusCategory === 'done' ? (task.completedAt ?? new Date()) : null,
                },
              }),
            ),
          );
        }
        await db.boardColumn.delete({ where: { id: column.id } });
      },
    }),
  ];
}
