import {
  createProjectInputSchema,
  idSchema,
  projectSchema,
  projectStatusSchema,
  updateProjectInputSchema,
  type Project as ProjectDto,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Db } from '../../core/db';
import type { Deps } from '../../core/deps';
import { notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { assertOwned } from '../../core/ownership';
import { dateToDay, dayToDate } from '../../core/time';
import type { Project } from '../../generated/prisma/client';

/** Progresso do projeto = tarefas concluídas ÷ todas as tarefas dele. */
export async function projectViews(
  db: Db,
  userId: string,
  projects: Project[],
): Promise<ProjectDto[]> {
  const counts = await db.task.groupBy({
    by: ['projectId', 'status'],
    where: { userId, projectId: { in: projects.map((p) => p.id) } },
    _count: { _all: true },
  });
  return projects.map((p) => {
    let done = 0;
    let total = 0;
    for (const row of counts) {
      if (row.projectId !== p.id) continue;
      total += row._count._all;
      if (row.status === 'done') done += row._count._all;
    }
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      areaId: p.areaId,
      goalId: p.goalId,
      status: p.status,
      dueDate: p.dueDate ? dateToDay(p.dueDate) : null,
      openTaskCount: total - done,
      doneTaskCount: done,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
      createdAt: p.createdAt.toISOString(),
    };
  });
}

export function projectsRoutes({ db }: Deps): AnyRoute[] {
  const idParams = z.object({ id: idSchema });

  async function findOwned(userId: string, id: string) {
    const project = await db.project.findFirst({ where: { id, userId } });
    if (!project) throw notFound();
    return project;
  }

  return [
    route({
      method: 'get',
      path: '/projects',
      tag: 'Projetos',
      summary: 'Listar projetos',
      query: z.object({ status: projectStatusSchema.optional(), goalId: idSchema.optional() }),
      response: z.array(projectSchema),
      async handler({ userId, query }) {
        const projects = await db.project.findMany({
          where: {
            userId,
            ...(query.status ? { status: query.status } : {}),
            ...(query.goalId ? { goalId: query.goalId } : {}),
          },
          orderBy: { createdAt: 'desc' },
        });
        return projectViews(db, userId, projects);
      },
    }),

    route({
      method: 'get',
      path: '/projects/:id',
      tag: 'Projetos',
      summary: 'Buscar projeto',
      params: idParams,
      response: projectSchema,
      async handler({ userId, params }) {
        const [view] = await projectViews(db, userId, [await findOwned(userId, params.id)]);
        return view!;
      },
    }),

    route({
      method: 'post',
      path: '/projects',
      tag: 'Projetos',
      summary: 'Criar projeto',
      body: createProjectInputSchema,
      response: projectSchema,
      async handler({ userId, body }) {
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        const project = await db.project.create({
          data: {
            userId,
            name: body.name,
            description: body.description ?? null,
            areaId: body.areaId ?? null,
            goalId: body.goalId ?? null,
            dueDate: body.dueDate ? dayToDate(body.dueDate) : null,
          },
        });
        const [view] = await projectViews(db, userId, [project]);
        return view!;
      },
    }),

    route({
      method: 'patch',
      path: '/projects/:id',
      tag: 'Projetos',
      summary: 'Atualizar projeto',
      description: 'Também muda o status (ativo, pausado, concluído, arquivado).',
      params: idParams,
      body: updateProjectInputSchema,
      response: projectSchema,
      async handler({ userId, params, body }) {
        await findOwned(userId, params.id);
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        const { dueDate, ...rest } = body;
        const project = await db.project.update({
          where: { id: params.id },
          data: {
            ...rest,
            ...(dueDate !== undefined ? { dueDate: dueDate ? dayToDate(dueDate) : null } : {}),
          },
        });
        const [view] = await projectViews(db, userId, [project]);
        return view!;
      },
    }),

    route({
      method: 'delete',
      path: '/projects/:id',
      tag: 'Projetos',
      summary: 'Excluir projeto',
      description: 'As tarefas do projeto continuam existindo, sem projeto.',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.project.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),
  ];
}
