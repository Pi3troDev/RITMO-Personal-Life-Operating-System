import {
  challengeSchema,
  challengeStatusSchema,
  createChallengeInputSchema,
  createDevProjectInputSchema,
  createRoadmapNodeInputSchema,
  devProjectDetailSchema,
  devProjectSchema,
  devProjectStatusSchema,
  idSchema,
  roadmapNodeSchema,
  updateChallengeInputSchema,
  updateDevProjectInputSchema,
  updateRoadmapNodeInputSchema,
  type Challenge as ChallengeDto,
  type DevProject as DevProjectDto,
  type RoadmapNode as RoadmapDto,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Db } from '../../core/db';
import type { Deps } from '../../core/deps';
import { badRequest, notFound } from '../../core/errors';
import { crudRoutes, defined } from '../../core/http/crud';
import { route, type AnyRoute } from '../../core/http/route';
import { assertOwned } from '../../core/ownership';
import type { Challenge, DevProject, RoadmapNode } from '../../generated/prisma/client';

const toNodeDto = (n: RoadmapNode): RoadmapDto => ({
  id: n.id,
  devProjectId: n.devProjectId,
  parentId: n.parentId,
  title: n.title,
  description: n.description,
  status: n.status,
  position: n.position,
});

const toChallengeDto = (c: Challenge): ChallengeDto => ({
  id: c.id,
  title: c.title,
  platform: c.platform,
  url: c.url,
  difficulty: c.difficulty,
  status: c.status,
  notes: c.notes,
  solvedAt: c.solvedAt?.toISOString() ?? null,
  createdAt: c.createdAt.toISOString(),
});

async function projectViews(
  db: Db,
  userId: string,
  projects: DevProject[],
): Promise<DevProjectDto[]> {
  const counts = projects.length
    ? await db.roadmapNode.groupBy({
        by: ['devProjectId', 'status'],
        where: { userId, devProjectId: { in: projects.map((p) => p.id) } },
        _count: { _all: true },
      })
    : [];
  return projects.map((p) => {
    const mine = counts.filter((c) => c.devProjectId === p.id);
    const total = mine.reduce((n, c) => n + c._count._all, 0);
    const done = mine.filter((c) => c.status === 'done').reduce((n, c) => n + c._count._all, 0);
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      status: p.status,
      repoUrl: p.repoUrl,
      demoUrl: p.demoUrl,
      stack: (p.stack as string[] | null) ?? [],
      areaId: p.areaId,
      goalId: p.goalId,
      roadmapTotal: total,
      roadmapDone: done,
      progress: total === 0 ? 0 : Math.round((done / total) * 100),
      createdAt: p.createdAt.toISOString(),
    };
  });
}

export function devRoutes(deps: Deps): AnyRoute[] {
  const { db } = deps;
  const tag = 'Dev Space';
  const idParams = z.object({ id: idSchema });

  async function findProject(userId: string, id: string) {
    const project = await db.devProject.findFirst({ where: { id, userId } });
    if (!project) throw notFound();
    return project;
  }

  return [
    route({
      method: 'get',
      path: '/dev/projects',
      tag,
      summary: 'Listar projetos de desenvolvimento',
      description:
        'Ideia, planejado, em andamento, pausado ou concluído; com progresso do roadmap.',
      query: z.object({ status: devProjectStatusSchema.optional() }),
      response: z.array(devProjectSchema),
      async handler({ userId, query }) {
        const projects = await db.devProject.findMany({
          where: { userId, ...(query.status ? { status: query.status } : {}) },
          orderBy: { createdAt: 'desc' },
        });
        return projectViews(db, userId, projects);
      },
    }),

    route({
      method: 'post',
      path: '/dev/projects',
      tag,
      summary: 'Criar projeto de desenvolvimento',
      body: createDevProjectInputSchema,
      response: devProjectSchema,
      async handler({ userId, body }) {
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        const project = await db.devProject.create({
          data: {
            userId,
            name: body.name,
            description: body.description ?? null,
            status: body.status ?? 'idea',
            repoUrl: body.repoUrl ?? null,
            demoUrl: body.demoUrl ?? null,
            stack: body.stack ?? [],
            areaId: body.areaId ?? null,
            goalId: body.goalId ?? null,
          },
        });
        return (await projectViews(db, userId, [project]))[0]!;
      },
    }),

    route({
      method: 'get',
      path: '/dev/projects/:id',
      tag,
      summary: 'Projeto com o roadmap visual',
      params: idParams,
      response: devProjectDetailSchema,
      async handler({ userId, params }) {
        const project = await findProject(userId, params.id);
        const [view, nodes] = await Promise.all([
          projectViews(db, userId, [project]).then((v) => v[0]!),
          db.roadmapNode.findMany({
            where: { devProjectId: project.id },
            orderBy: { position: 'asc' },
          }),
        ]);
        return { ...view, roadmap: nodes.map(toNodeDto) };
      },
    }),

    route({
      method: 'patch',
      path: '/dev/projects/:id',
      tag,
      summary: 'Editar projeto de desenvolvimento',
      params: idParams,
      body: updateDevProjectInputSchema,
      response: devProjectSchema,
      async handler({ userId, params, body }) {
        await findProject(userId, params.id);
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        const project = await db.devProject.update({
          where: { id: params.id },
          data: defined(body),
        });
        return (await projectViews(db, userId, [project]))[0]!;
      },
    }),

    route({
      method: 'delete',
      path: '/dev/projects/:id',
      tag,
      summary: 'Excluir projeto de desenvolvimento',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.devProject.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    route({
      method: 'post',
      path: '/dev/projects/:id/roadmap',
      tag,
      summary: 'Adicionar item ao roadmap',
      description: '`parentId` aninha o item dentro de outro do mesmo projeto.',
      params: idParams,
      body: createRoadmapNodeInputSchema,
      response: roadmapNodeSchema,
      async handler({ userId, params, body }) {
        const project = await findProject(userId, params.id);
        if (
          body.parentId &&
          !(await db.roadmapNode.findFirst({
            where: { id: body.parentId, devProjectId: project.id },
          }))
        ) {
          throw badRequest('Item pai inválido.');
        }
        const last = await db.roadmapNode.aggregate({
          where: { devProjectId: project.id },
          _max: { position: true },
        });
        const node = await db.roadmapNode.create({
          data: {
            userId,
            devProjectId: project.id,
            parentId: body.parentId ?? null,
            title: body.title,
            description: body.description ?? null,
            position: (last._max.position ?? 0) + 1000,
          },
        });
        return toNodeDto(node);
      },
    }),

    route({
      method: 'patch',
      path: '/dev/roadmap/:id',
      tag,
      summary: 'Editar, mover ou concluir item do roadmap',
      params: idParams,
      body: updateRoadmapNodeInputSchema,
      response: roadmapNodeSchema,
      async handler({ userId, params, body }) {
        const current = await db.roadmapNode.findFirst({ where: { id: params.id, userId } });
        if (!current) throw notFound();
        if (body.parentId) {
          if (body.parentId === current.id)
            throw badRequest('Um item não pode ser pai de si mesmo.');
          if (
            !(await db.roadmapNode.findFirst({
              where: { id: body.parentId, devProjectId: current.devProjectId },
            }))
          ) {
            throw badRequest('Item pai inválido.');
          }
        }
        return toNodeDto(
          await db.roadmapNode.update({ where: { id: current.id }, data: defined(body) }),
        );
      },
    }),

    route({
      method: 'delete',
      path: '/dev/roadmap/:id',
      tag,
      summary: 'Remover item do roadmap',
      description: 'Os itens filhos sobem para a raiz do roadmap.',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.roadmapNode.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    ...crudRoutes({
      db,
      tag,
      path: '/dev/challenges',
      names: ['desafio', 'desafios'],
      model: 'challenge',
      response: challengeSchema,
      create: createChallengeInputSchema,
      update: updateChallengeInputSchema,
      query: z.object({ status: challengeStatusSchema.optional() }),
      where: (q: { status?: string }) => (q.status ? { status: q.status } : {}),
      orderBy: { createdAt: 'desc' },
      toDto: (row: Challenge) => toChallengeDto(row),
      toCreate: (input: z.infer<typeof createChallengeInputSchema>) => ({
        title: input.title,
        platform: input.platform ?? null,
        url: input.url ?? null,
        difficulty: input.difficulty ?? 'medium',
        notes: input.notes ?? null,
      }),
      toUpdate: (
        input: z.infer<typeof updateChallengeInputSchema>,
        _userId: string,
        current: Challenge,
      ) => {
        const { status, ...rest } = input;
        return {
          ...defined(rest),
          ...(status
            ? { status, solvedAt: status === 'solved' ? (current.solvedAt ?? clock.now()) : null }
            : {}),
        };
      },
    }),
  ];
}
