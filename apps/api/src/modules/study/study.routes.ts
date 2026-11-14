import {
  createLessonInputSchema,
  createResourceInputSchema,
  createStudyModuleInputSchema,
  createStudyTrackInputSchema,
  dateSchema,
  idSchema,
  lessonSchema,
  resourceSchema,
  studyModuleSchema,
  studyTrackDetailSchema,
  studyTrackKindSchema,
  studyTrackSchema,
  studyTrackStatusSchema,
  updateLessonInputSchema,
  updateResourceInputSchema,
  updateStudyModuleInputSchema,
  updateStudyTrackInputSchema,
  type Lesson as LessonDto,
  type Resource as ResourceDto,
  type StudyModule as ModuleDto,
  type StudyTrack as TrackDto,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Db } from '../../core/db';
import type { Deps } from '../../core/deps';
import { badRequest, notFound } from '../../core/errors';
import { defined } from '../../core/http/crud';
import { route, type AnyRoute } from '../../core/http/route';
import { assertOwned, userClock, type UserClock } from '../../core/ownership';
import { addDays, dateToDay, dayToDate, startOfWeek } from '../../core/time';
import type { Lesson, Resource, StudyModule, StudyTrack } from '../../generated/prisma/client';

const toModuleDto = (m: StudyModule): ModuleDto => ({
  id: m.id,
  trackId: m.trackId,
  name: m.name,
  position: m.position,
});

const toLessonDto = (l: Lesson): LessonDto => ({
  id: l.id,
  trackId: l.trackId,
  moduleId: l.moduleId,
  title: l.title,
  status: l.status,
  durationMinutes: l.durationMinutes,
  notes: l.notes,
  position: l.position,
  completedAt: l.completedAt?.toISOString() ?? null,
});

const toResourceDto = (r: Resource): ResourceDto => ({
  id: r.id,
  trackId: r.trackId,
  title: r.title,
  type: r.type,
  url: r.url,
  notes: r.notes,
  createdAt: r.createdAt.toISOString(),
});

/** Trilhas com progresso (aulas concluídas ÷ total) e tempo estudado, todo o histórico e a semana atual. */
export async function trackViews(
  db: Db,
  userId: string,
  tracks: StudyTrack[],
  user: UserClock,
): Promise<TrackDto[]> {
  if (tracks.length === 0) return [];
  const ids = tracks.map((t) => t.id);
  const weekStart = startOfWeek(user.today, user.weekStartsOn);
  const [lessons, total, week] = await Promise.all([
    db.lesson.groupBy({
      by: ['trackId', 'status'],
      where: { userId, trackId: { in: ids } },
      _count: { _all: true },
    }),
    db.timeEntry.groupBy({
      by: ['studyTrackId'],
      where: { userId, studyTrackId: { in: ids }, timerState: 'stopped' },
      _sum: { durationSeconds: true },
    }),
    db.timeEntry.groupBy({
      by: ['studyTrackId'],
      where: {
        userId,
        studyTrackId: { in: ids },
        timerState: 'stopped',
        localDate: { gte: dayToDate(weekStart), lte: dayToDate(addDays(weekStart, 6)) },
      },
      _sum: { durationSeconds: true },
    }),
  ]);

  return tracks.map((t) => {
    const mine = lessons.filter((l) => l.trackId === t.id);
    const lessonsTotal = mine.reduce((n, l) => n + l._count._all, 0);
    const lessonsDone = mine
      .filter((l) => l.status === 'done')
      .reduce((n, l) => n + l._count._all, 0);
    const minutes = (rows: typeof total) =>
      Math.round((rows.find((r) => r.studyTrackId === t.id)?._sum.durationSeconds ?? 0) / 60);
    return {
      id: t.id,
      name: t.name,
      kind: t.kind,
      status: t.status,
      description: t.description,
      provider: t.provider,
      url: t.url,
      areaId: t.areaId,
      goalId: t.goalId,
      weeklyTargetMinutes: t.weeklyTargetMinutes,
      startedAt: t.startedAt ? dateToDay(t.startedAt) : null,
      completedAt: t.completedAt?.toISOString() ?? null,
      lessonsTotal,
      lessonsDone,
      progress: lessonsTotal === 0 ? 0 : Math.round((lessonsDone / lessonsTotal) * 100),
      minutesStudied: minutes(total),
      minutesThisWeek: minutes(week),
      createdAt: t.createdAt.toISOString(),
    };
  });
}

export function studyRoutes({ db }: Deps): AnyRoute[] {
  const tag = 'Estudos';
  const idParams = z.object({ id: idSchema });

  async function findTrack(userId: string, id: string) {
    const track = await db.studyTrack.findFirst({ where: { id, userId } });
    if (!track) throw notFound();
    return track;
  }

  async function viewOf(userId: string, track: StudyTrack) {
    const user = await userClock(db, userId);
    return (await trackViews(db, userId, [track], user))[0]!;
  }

  async function detail(userId: string, track: StudyTrack) {
    const [view, modules, lessons, resources] = await Promise.all([
      viewOf(userId, track),
      db.studyModule.findMany({ where: { trackId: track.id }, orderBy: { position: 'asc' } }),
      db.lesson.findMany({ where: { trackId: track.id }, orderBy: { position: 'asc' } }),
      db.resource.findMany({ where: { trackId: track.id }, orderBy: { createdAt: 'asc' } }),
    ]);
    return {
      ...view,
      modules: modules.map(toModuleDto),
      lessons: lessons.map(toLessonDto),
      resources: resources.map(toResourceDto),
    };
  }

  /** Começar uma aula põe a trilha "em andamento" e registra o dia de início. */
  async function touchTrack(track: StudyTrack) {
    if (track.status !== 'not_started') return;
    await db.studyTrack.update({
      where: { id: track.id },
      data: {
        status: 'in_progress',
        startedAt: track.startedAt ?? dayToDate(dateToDay(clock.now())),
      },
    });
  }

  return [
    route({
      method: 'get',
      path: '/study/tracks',
      tag,
      summary: 'Listar trilhas e cursos',
      description:
        'Com progresso (aulas concluídas ÷ total) e tempo estudado no total e na semana.',
      query: z.object({
        status: studyTrackStatusSchema.optional(),
        kind: studyTrackKindSchema.optional(),
      }),
      response: z.array(studyTrackSchema),
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        const tracks = await db.studyTrack.findMany({
          where: {
            userId,
            ...(query.status ? { status: query.status } : {}),
            ...(query.kind ? { kind: query.kind } : {}),
          },
          orderBy: { createdAt: 'asc' },
        });
        return trackViews(db, userId, tracks, user);
      },
    }),

    route({
      method: 'post',
      path: '/study/tracks',
      tag,
      summary: 'Criar trilha ou curso',
      body: createStudyTrackInputSchema,
      response: studyTrackSchema,
      async handler({ userId, body }) {
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        const track = await db.studyTrack.create({
          data: {
            userId,
            name: body.name,
            kind: body.kind ?? 'track',
            description: body.description ?? null,
            provider: body.provider ?? null,
            url: body.url ?? null,
            areaId: body.areaId ?? null,
            goalId: body.goalId ?? null,
            weeklyTargetMinutes: body.weeklyTargetMinutes ?? null,
          },
        });
        return viewOf(userId, track);
      },
    }),

    route({
      method: 'get',
      path: '/study/summary',
      tag,
      summary: 'Resumo de estudo da semana',
      description: 'Tempo estudado na semana atual contra a meta semanal de cada trilha.',
      response: z.object({
        weekStart: dateSchema,
        totalMinutesThisWeek: z.number().int(),
        tracks: z.array(
          z.object({
            id: idSchema,
            name: z.string(),
            minutesThisWeek: z.number().int(),
            weeklyTargetMinutes: z.number().int().nullable(),
          }),
        ),
      }),
      async handler({ userId }) {
        const user = await userClock(db, userId);
        const tracks = await db.studyTrack.findMany({
          where: { userId, status: { in: ['not_started', 'in_progress'] } },
        });
        const views = await trackViews(db, userId, tracks, user);
        const untracked = await db.timeEntry.aggregate({
          where: {
            userId,
            kind: 'study',
            studyTrackId: null,
            timerState: 'stopped',
            localDate: {
              gte: dayToDate(startOfWeek(user.today, user.weekStartsOn)),
              lte: dayToDate(user.today),
            },
          },
          _sum: { durationSeconds: true },
        });
        const tracked = views.reduce((n, v) => n + v.minutesThisWeek, 0);
        return {
          weekStart: startOfWeek(user.today, user.weekStartsOn),
          totalMinutesThisWeek: tracked + Math.round((untracked._sum.durationSeconds ?? 0) / 60),
          tracks: views.map((v) => ({
            id: v.id,
            name: v.name,
            minutesThisWeek: v.minutesThisWeek,
            weeklyTargetMinutes: v.weeklyTargetMinutes,
          })),
        };
      },
    }),

    route({
      method: 'get',
      path: '/study/tracks/:id',
      tag,
      summary: 'Trilha com módulos, aulas e materiais',
      params: idParams,
      response: studyTrackDetailSchema,
      async handler({ userId, params }) {
        return detail(userId, await findTrack(userId, params.id));
      },
    }),

    route({
      method: 'patch',
      path: '/study/tracks/:id',
      tag,
      summary: 'Editar trilha, pausar ou concluir',
      params: idParams,
      body: updateStudyTrackInputSchema,
      response: studyTrackSchema,
      async handler({ userId, params, body }) {
        const current = await findTrack(userId, params.id);
        await assertOwned(db, 'area', userId, body.areaId);
        await assertOwned(db, 'goal', userId, body.goalId);
        const { status, ...rest } = body;
        const track = await db.studyTrack.update({
          where: { id: current.id },
          data: {
            ...defined(rest),
            ...(status
              ? {
                  status,
                  completedAt: status === 'completed' ? (current.completedAt ?? clock.now()) : null,
                  ...(status === 'in_progress' && !current.startedAt
                    ? { startedAt: dayToDate(dateToDay(clock.now())) }
                    : {}),
                }
              : {}),
          },
        });
        return viewOf(userId, track);
      },
    }),

    route({
      method: 'delete',
      path: '/study/tracks/:id',
      tag,
      summary: 'Excluir trilha',
      description: 'Apaga módulos, aulas e materiais. O tempo já estudado continua no histórico.',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.studyTrack.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    // ---- módulos ---------------------------------------------------------------------------
    route({
      method: 'post',
      path: '/study/tracks/:id/modules',
      tag,
      summary: 'Criar módulo na trilha',
      params: idParams,
      body: createStudyModuleInputSchema,
      response: studyModuleSchema,
      async handler({ userId, params, body }) {
        const track = await findTrack(userId, params.id);
        const last = await db.studyModule.aggregate({
          where: { trackId: track.id },
          _max: { position: true },
        });
        const created = await db.studyModule.create({
          data: {
            userId,
            trackId: track.id,
            name: body.name,
            position: (last._max.position ?? 0) + 1000,
          },
        });
        return toModuleDto(created);
      },
    }),

    route({
      method: 'patch',
      path: '/study/modules/:id',
      tag,
      summary: 'Renomear ou reordenar módulo',
      params: idParams,
      body: updateStudyModuleInputSchema,
      response: studyModuleSchema,
      async handler({ userId, params, body }) {
        if (!(await db.studyModule.findFirst({ where: { id: params.id, userId } })))
          throw notFound();
        return toModuleDto(
          await db.studyModule.update({ where: { id: params.id }, data: defined(body) }),
        );
      },
    }),

    route({
      method: 'delete',
      path: '/study/modules/:id',
      tag,
      summary: 'Excluir módulo',
      description: 'As aulas do módulo continuam na trilha, sem módulo.',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.studyModule.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    // ---- aulas -----------------------------------------------------------------------------
    route({
      method: 'post',
      path: '/study/tracks/:id/lessons',
      tag,
      summary: 'Criar aula na trilha',
      params: idParams,
      body: createLessonInputSchema,
      response: lessonSchema,
      async handler({ userId, params, body }) {
        const track = await findTrack(userId, params.id);
        if (
          body.moduleId &&
          !(await db.studyModule.findFirst({ where: { id: body.moduleId, trackId: track.id } }))
        ) {
          throw badRequest('Módulo inválido.');
        }
        const last = await db.lesson.aggregate({
          where: { trackId: track.id },
          _max: { position: true },
        });
        const lesson = await db.lesson.create({
          data: {
            userId,
            trackId: track.id,
            moduleId: body.moduleId ?? null,
            title: body.title,
            durationMinutes: body.durationMinutes ?? null,
            notes: body.notes ?? null,
            position: (last._max.position ?? 0) + 1000,
          },
        });
        return toLessonDto(lesson);
      },
    }),

    route({
      method: 'patch',
      path: '/study/lessons/:id',
      tag,
      summary: 'Editar, reordenar ou concluir aula',
      description: 'Começar ou concluir uma aula coloca a trilha "em andamento".',
      params: idParams,
      body: updateLessonInputSchema,
      response: lessonSchema,
      async handler({ userId, params, body }) {
        const current = await db.lesson.findFirst({ where: { id: params.id, userId } });
        if (!current) throw notFound();
        if (
          body.moduleId &&
          !(await db.studyModule.findFirst({
            where: { id: body.moduleId, trackId: current.trackId },
          }))
        ) {
          throw badRequest('Módulo inválido.');
        }
        const { status, ...rest } = body;
        const lesson = await db.lesson.update({
          where: { id: current.id },
          data: {
            ...defined(rest),
            ...(status
              ? {
                  status,
                  completedAt: status === 'done' ? (current.completedAt ?? clock.now()) : null,
                }
              : {}),
          },
        });
        if (status && status !== 'not_started')
          await touchTrack(await findTrack(userId, current.trackId));
        return toLessonDto(lesson);
      },
    }),

    route({
      method: 'delete',
      path: '/study/lessons/:id',
      tag,
      summary: 'Excluir aula',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.lesson.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    // ---- materiais -------------------------------------------------------------------------
    route({
      method: 'post',
      path: '/study/tracks/:id/resources',
      tag,
      summary: 'Adicionar material à trilha',
      description:
        'Links, vídeos, artigos, documentação, livros. Só por link: não há upload de arquivos nesta versão.',
      params: idParams,
      body: createResourceInputSchema,
      response: resourceSchema,
      async handler({ userId, params, body }) {
        const track = await findTrack(userId, params.id);
        const resource = await db.resource.create({
          data: {
            userId,
            trackId: track.id,
            title: body.title,
            type: body.type ?? 'link',
            url: body.url ?? null,
            notes: body.notes ?? null,
          },
        });
        return toResourceDto(resource);
      },
    }),

    route({
      method: 'patch',
      path: '/study/resources/:id',
      tag,
      summary: 'Editar material',
      params: idParams,
      body: updateResourceInputSchema,
      response: resourceSchema,
      async handler({ userId, params, body }) {
        if (!(await db.resource.findFirst({ where: { id: params.id, userId } }))) throw notFound();
        return toResourceDto(
          await db.resource.update({ where: { id: params.id }, data: defined(body) }),
        );
      },
    }),

    route({
      method: 'delete',
      path: '/study/resources/:id',
      tag,
      summary: 'Remover material',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.resource.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),
  ];
}
