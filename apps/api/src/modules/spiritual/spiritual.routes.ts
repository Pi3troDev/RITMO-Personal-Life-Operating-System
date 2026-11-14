import {
  bibleReadingSchema,
  createBibleReadingInputSchema,
  createPrayerLogInputSchema,
  createPrayerRequestInputSchema,
  dateSchema,
  devotionalSchema,
  idSchema,
  prayerLogSchema,
  prayerRequestSchema,
  prayerStatusSchema,
  spiritualSummarySchema,
  updatePrayerRequestInputSchema,
  upsertDevotionalInputSchema,
  type BibleReading as BibleDto,
  type Devotional as DevotionalDto,
  type PrayerLog as PrayerLogDto,
  type PrayerRequest as PrayerDto,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Deps } from '../../core/deps';
import { badRequest, notFound } from '../../core/errors';
import { defined } from '../../core/http/crud';
import { route, type AnyRoute } from '../../core/http/route';
import { userClock } from '../../core/ownership';
import { addDays, dateToDay, dayToDate } from '../../core/time';
import { dropTimeEntry, syncTimeEntry } from '../../core/time-ledger';
import type {
  BibleReading,
  Devotional,
  PrayerLog,
  PrayerRequest,
} from '../../generated/prisma/client';
import { targetFor, weekOf } from '../targets/progress';

const toDevotionalDto = (d: Devotional): DevotionalDto => ({
  id: d.id,
  date: dateToDay(d.date),
  title: d.title,
  passage: d.passage,
  reflection: d.reflection,
  application: d.application,
  updatedAt: d.updatedAt.toISOString(),
});

const toBibleDto = (b: BibleReading): BibleDto => ({
  id: b.id,
  date: dateToDay(b.date),
  book: b.book,
  chapterFrom: b.chapterFrom,
  chapterTo: b.chapterTo,
  chapters: b.chapterTo - b.chapterFrom + 1,
  notes: b.notes,
});

const toPrayerDto = (p: PrayerRequest): PrayerDto => ({
  id: p.id,
  title: p.title,
  description: p.description,
  status: p.status,
  answeredAt: p.answeredAt?.toISOString() ?? null,
  answerNote: p.answerNote,
  createdAt: p.createdAt.toISOString(),
});

const toPrayerLogDto = (l: PrayerLog): PrayerLogDto => ({
  id: l.id,
  date: dateToDay(l.date),
  minutes: l.minutes,
  requestId: l.requestId,
  notes: l.notes,
});

export function spiritualRoutes({ db }: Deps): AnyRoute[] {
  const tag = 'Espiritualidade';
  const idParams = z.object({ id: idSchema });
  const range = z.object({
    from: dateSchema.optional(),
    to: dateSchema.optional(),
    limit: z.coerce.number().int().min(1).max(366).default(60),
  });

  const between = (q: z.infer<typeof range>) =>
    q.from || q.to
      ? {
          date: {
            ...(q.from ? { gte: dayToDate(q.from) } : {}),
            ...(q.to ? { lte: dayToDate(q.to) } : {}),
          },
        }
      : {};

  return [
    // ---- devocional ------------------------------------------------------------------------
    route({
      method: 'get',
      path: '/spiritual/devotionals',
      tag,
      summary: 'Histórico de devocionais',
      query: range,
      response: z.array(devotionalSchema),
      async handler({ userId, query }) {
        const rows = await db.devotional.findMany({
          where: { userId, ...between(query) },
          orderBy: { date: 'desc' },
          take: query.limit,
        });
        return rows.map(toDevotionalDto);
      },
    }),

    route({
      method: 'put',
      path: '/spiritual/devotionals/:date',
      tag,
      summary: 'Registrar (ou editar) o devocional de um dia',
      description: 'Um devocional por dia: passagem, reflexão e aplicação.',
      params: z.object({ date: dateSchema }),
      body: upsertDevotionalInputSchema,
      response: devotionalSchema,
      status: 200,
      async handler({ userId, params, body }) {
        const user = await userClock(db, userId);
        if (params.date > user.today)
          throw badRequest('Não é possível registrar um devocional em um dia futuro.');
        const data = {
          title: body.title ?? null,
          passage: body.passage ?? null,
          reflection: body.reflection,
          application: body.application ?? null,
        };
        const saved = await db.devotional.upsert({
          where: { userId_date: { userId, date: dayToDate(params.date) } },
          create: { userId, date: dayToDate(params.date), ...data },
          update: data,
        });
        return toDevotionalDto(saved);
      },
    }),

    route({
      method: 'delete',
      path: '/spiritual/devotionals/:date',
      tag,
      summary: 'Apagar o devocional de um dia',
      params: z.object({ date: dateSchema }),
      async handler({ userId, params }) {
        const { count } = await db.devotional.deleteMany({
          where: { userId, date: dayToDate(params.date) },
        });
        if (count === 0) throw notFound();
      },
    }),

    // ---- leitura bíblica -------------------------------------------------------------------
    route({
      method: 'get',
      path: '/spiritual/bible-readings',
      tag,
      summary: 'Leituras bíblicas',
      query: range,
      response: z.array(bibleReadingSchema),
      async handler({ userId, query }) {
        const rows = await db.bibleReading.findMany({
          where: { userId, ...between(query) },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: query.limit,
        });
        return rows.map(toBibleDto);
      },
    }),

    route({
      method: 'post',
      path: '/spiritual/bible-readings',
      tag,
      summary: 'Registrar leitura bíblica',
      description:
        'Livro e capítulos (de/até). Os capítulos lidos alimentam a meta semanal de leitura.',
      body: createBibleReadingInputSchema,
      response: bibleReadingSchema,
      async handler({ userId, body }) {
        const user = await userClock(db, userId);
        const date = body.date ?? user.today;
        if (date > user.today)
          throw badRequest('Não é possível registrar uma leitura em um dia futuro.');
        const reading = await db.bibleReading.create({
          data: {
            userId,
            date: dayToDate(date),
            book: body.book,
            chapterFrom: body.chapterFrom,
            chapterTo: body.chapterTo ?? body.chapterFrom,
            notes: body.notes ?? null,
          },
        });
        return toBibleDto(reading);
      },
    }),

    route({
      method: 'delete',
      path: '/spiritual/bible-readings/:id',
      tag,
      summary: 'Apagar leitura bíblica',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.bibleReading.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    // ---- pedidos de oração -----------------------------------------------------------------
    route({
      method: 'get',
      path: '/spiritual/prayer-requests',
      tag,
      summary: 'Pedidos de oração',
      query: z.object({ status: prayerStatusSchema.optional() }),
      response: z.array(prayerRequestSchema),
      async handler({ userId, query }) {
        const rows = await db.prayerRequest.findMany({
          where: { userId, ...(query.status ? { status: query.status } : {}) },
          orderBy: { createdAt: 'desc' },
        });
        return rows.map(toPrayerDto);
      },
    }),

    route({
      method: 'post',
      path: '/spiritual/prayer-requests',
      tag,
      summary: 'Criar pedido de oração',
      body: createPrayerRequestInputSchema,
      response: prayerRequestSchema,
      async handler({ userId, body }) {
        const request = await db.prayerRequest.create({
          data: { userId, title: body.title, description: body.description ?? null },
        });
        return toPrayerDto(request);
      },
    }),

    route({
      method: 'patch',
      path: '/spiritual/prayer-requests/:id',
      tag,
      summary: 'Editar pedido, marcar como respondido ou arquivar',
      params: idParams,
      body: updatePrayerRequestInputSchema,
      response: prayerRequestSchema,
      async handler({ userId, params, body }) {
        const current = await db.prayerRequest.findFirst({ where: { id: params.id, userId } });
        if (!current) throw notFound();
        const { status, ...rest } = body;
        const updated = await db.prayerRequest.update({
          where: { id: current.id },
          data: {
            ...defined(rest),
            ...(status
              ? {
                  status,
                  answeredAt: status === 'answered' ? (current.answeredAt ?? clock.now()) : null,
                }
              : {}),
          },
        });
        return toPrayerDto(updated);
      },
    }),

    route({
      method: 'delete',
      path: '/spiritual/prayer-requests/:id',
      tag,
      summary: 'Excluir pedido de oração',
      description: 'Os registros de oração ficam no histórico, sem pedido.',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.prayerRequest.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    // ---- registros de oração ---------------------------------------------------------------
    route({
      method: 'get',
      path: '/spiritual/prayer-logs',
      tag,
      summary: 'Registros de oração',
      query: range,
      response: z.array(prayerLogSchema),
      async handler({ userId, query }) {
        const rows = await db.prayerLog.findMany({
          where: { userId, ...between(query) },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
          take: query.limit,
        });
        return rows.map(toPrayerLogDto);
      },
    }),

    route({
      method: 'post',
      path: '/spiritual/prayer-logs',
      tag,
      summary: 'Registrar um momento de oração',
      description: 'Com `minutes`, o tempo entra também no registro de tempo (tipo "espiritual").',
      body: createPrayerLogInputSchema,
      response: prayerLogSchema,
      async handler({ userId, body }) {
        const user = await userClock(db, userId);
        const date = body.date ?? user.today;
        if (date > user.today)
          throw badRequest('Não é possível registrar uma oração em um dia futuro.');
        if (
          body.requestId &&
          !(await db.prayerRequest.findFirst({ where: { id: body.requestId, userId } }))
        ) {
          throw badRequest('Pedido inválido.');
        }
        const timeEntryId = await syncTimeEntry(db, userId, {
          entryId: null,
          minutes: body.minutes,
          date,
          kind: 'spiritual',
          title: 'Oração',
          timezone: user.timezone,
        });
        const log = await db.prayerLog.create({
          data: {
            userId,
            date: dayToDate(date),
            minutes: body.minutes ?? null,
            requestId: body.requestId ?? null,
            notes: body.notes ?? null,
            timeEntryId,
          },
        });
        return toPrayerLogDto(log);
      },
    }),

    route({
      method: 'delete',
      path: '/spiritual/prayer-logs/:id',
      tag,
      summary: 'Apagar registro de oração',
      params: idParams,
      async handler({ userId, params }) {
        const log = await db.prayerLog.findFirst({ where: { id: params.id, userId } });
        if (!log) throw notFound();
        await dropTimeEntry(db, userId, log.timeEntryId);
        await db.prayerLog.delete({ where: { id: log.id } });
      },
    }),

    // ---- resumo ----------------------------------------------------------------------------
    route({
      method: 'get',
      path: '/spiritual/summary',
      tag,
      summary: 'Resumo da semana espiritual',
      description:
        'Sequência de devocionais (um dia sem devocional hoje ainda não quebra a sequência), capítulos lidos na semana, ' +
        'minutos de oração, pedidos ativos e respondidos.',
      response: spiritualSummarySchema,
      async handler({ userId }) {
        const user = await userClock(db, userId);
        const week = weekOf(user);
        const inWeek = { gte: dayToDate(week.start), lte: dayToDate(week.end) };
        const [devotionals, readings, prayers, active, answered, target] = await Promise.all([
          db.devotional.findMany({
            where: { userId, date: { gte: dayToDate(addDays(user.today, -400)) } },
            select: { date: true },
          }),
          db.bibleReading.findMany({ where: { userId, date: inWeek } }),
          db.prayerLog.aggregate({ where: { userId, date: inWeek }, _sum: { minutes: true } }),
          db.prayerRequest.count({ where: { userId, status: 'active' } }),
          db.prayerRequest.count({ where: { userId, status: 'answered' } }),
          targetFor(db, userId, 'spiritual'),
        ]);

        const days = new Set(devotionals.map((d) => dateToDay(d.date)));
        let streak = 0;
        for (let day = user.today; days.has(day) || day === user.today; day = addDays(day, -1)) {
          if (days.has(day)) streak++;
          if (!days.has(day) && day !== user.today) break;
        }
        return {
          weekStart: week.start,
          devotionalStreak: streak,
          devotionalDaysThisWeek: [...days].filter((d) => d >= week.start && d <= week.end).length,
          chaptersThisWeek: readings.reduce((n, r) => n + (r.chapterTo - r.chapterFrom + 1), 0),
          prayerMinutesThisWeek: prayers._sum.minutes ?? 0,
          activeRequests: active,
          answeredRequests: answered,
          weeklyTargetChapters: target?.metric === 'bible_chapters' ? target.targetValue : null,
        };
      },
    }),
  ];
}
