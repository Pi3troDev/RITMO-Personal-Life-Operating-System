import {
  bookQuoteSchema,
  bookSchema,
  bookStatusSchema,
  createBookInputSchema,
  createQuoteInputSchema,
  createReadingLogInputSchema,
  idSchema,
  readingLogSchema,
  readingSummarySchema,
  updateBookInputSchema,
  updateQuoteInputSchema,
  type Book as BookDto,
  type BookQuote as QuoteDto,
  type ReadingLog as LogDto,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { badRequest, notFound } from '../../core/errors';
import { defined } from '../../core/http/crud';
import { route, type AnyRoute } from '../../core/http/route';
import { assertOwned, userClock } from '../../core/ownership';
import { dateToDay, dayToDate } from '../../core/time';
import { dropTimeEntry, syncTimeEntry } from '../../core/time-ledger';
import type { Book, BookQuote, ReadingLog } from '../../generated/prisma/client';
import { targetFor, weekOf } from '../targets/progress';

const toBookDto = (b: Book): BookDto => ({
  id: b.id,
  title: b.title,
  author: b.author,
  totalPages: b.totalPages,
  currentPage: b.currentPage,
  status: b.status,
  coverUrl: b.coverUrl,
  rating: b.rating,
  startedAt: b.startedAt ? dateToDay(b.startedAt) : null,
  finishedAt: b.finishedAt ? dateToDay(b.finishedAt) : null,
  goalId: b.goalId,
  progress: b.totalPages ? Math.min(100, Math.round((b.currentPage / b.totalPages) * 100)) : null,
  createdAt: b.createdAt.toISOString(),
});

const toLogDto = (l: ReadingLog): LogDto => ({
  id: l.id,
  bookId: l.bookId,
  date: dateToDay(l.date),
  pagesRead: l.pagesRead,
  minutes: l.minutes,
  note: l.note,
});

const toQuoteDto = (q: BookQuote): QuoteDto => ({
  id: q.id,
  bookId: q.bookId,
  text: q.text,
  page: q.page,
  note: q.note,
  createdAt: q.createdAt.toISOString(),
});

export function readingRoutes({ db }: Deps): AnyRoute[] {
  const tag = 'Leitura';
  const idParams = z.object({ id: idSchema });

  async function findBook(userId: string, id: string) {
    const book = await db.book.findFirst({ where: { id, userId } });
    if (!book) throw notFound();
    return book;
  }

  return [
    route({
      method: 'get',
      path: '/reading/books',
      tag,
      summary: 'Biblioteca',
      query: z.object({ status: bookStatusSchema.optional() }),
      response: z.array(bookSchema),
      async handler({ userId, query }) {
        const books = await db.book.findMany({
          where: { userId, ...(query.status ? { status: query.status } : {}) },
          orderBy: { createdAt: 'desc' },
        });
        return books.map(toBookDto);
      },
    }),

    route({
      method: 'post',
      path: '/reading/books',
      tag,
      summary: 'Adicionar livro',
      description:
        'Capa só por link. Sem total de páginas, o progresso percentual não é calculado.',
      body: createBookInputSchema,
      response: bookSchema,
      async handler({ userId, body }) {
        await assertOwned(db, 'goal', userId, body.goalId);
        const user = await userClock(db, userId);
        const status = body.status ?? 'want_to_read';
        const book = await db.book.create({
          data: {
            userId,
            title: body.title,
            author: body.author ?? null,
            totalPages: body.totalPages ?? null,
            coverUrl: body.coverUrl ?? null,
            goalId: body.goalId ?? null,
            status,
            startedAt: status === 'reading' ? dayToDate(user.today) : null,
          },
        });
        return toBookDto(book);
      },
    }),

    route({
      method: 'get',
      path: '/reading/summary',
      tag,
      summary: 'Resumo da leitura',
      description:
        'Páginas e tempo lidos na semana, dias de leitura, livros terminados no ano e a meta semanal de páginas.',
      response: readingSummarySchema,
      async handler({ userId }) {
        const user = await userClock(db, userId);
        const week = weekOf(user);
        const between = { gte: dayToDate(week.start), lte: dayToDate(week.end) };
        const [logs, finished, target] = await Promise.all([
          db.readingLog.findMany({ where: { userId, date: between } }),
          db.book.count({
            where: {
              userId,
              status: 'finished',
              finishedAt: {
                gte: dayToDate(`${user.today.slice(0, 4)}-01-01`),
                lte: dayToDate(`${user.today.slice(0, 4)}-12-31`),
              },
            },
          }),
          targetFor(db, userId, 'reading'),
        ]);
        return {
          weekStart: week.start,
          pagesThisWeek: logs.reduce((n, l) => n + l.pagesRead, 0),
          minutesThisWeek: logs.reduce((n, l) => n + (l.minutes ?? 0), 0),
          readingDaysThisWeek: new Set(logs.map((l) => dateToDay(l.date))).size,
          booksFinishedThisYear: finished,
          weeklyTargetPages: target?.metric === 'pages_read' ? target.targetValue : null,
        };
      },
    }),

    route({
      method: 'get',
      path: '/reading/books/:id',
      tag,
      summary: 'Buscar livro',
      params: idParams,
      response: bookSchema,
      async handler({ userId, params }) {
        return toBookDto(await findBook(userId, params.id));
      },
    }),

    route({
      method: 'patch',
      path: '/reading/books/:id',
      tag,
      summary: 'Editar livro, mudar o status ou avaliar',
      description:
        'Começar a ler registra o dia de início; terminar registra o dia de conclusão e leva a página atual ao total.',
      params: idParams,
      body: updateBookInputSchema,
      response: bookSchema,
      async handler({ userId, params, body }) {
        const current = await findBook(userId, params.id);
        await assertOwned(db, 'goal', userId, body.goalId);
        const user = await userClock(db, userId);
        const { status, ...rest } = body;
        const totalPages = body.totalPages !== undefined ? body.totalPages : current.totalPages;

        const data: Record<string, unknown> = { ...defined(rest) };
        if (body.currentPage !== undefined && totalPages && body.currentPage > totalPages) {
          throw badRequest('A página atual passa do total de páginas.');
        }
        if (status) {
          data.status = status;
          if (status === 'reading' && !current.startedAt) data.startedAt = dayToDate(user.today);
          if (status === 'finished') {
            data.finishedAt = current.finishedAt ?? dayToDate(user.today);
            if (totalPages) data.currentPage = totalPages;
          } else data.finishedAt = null;
        }
        return toBookDto(await db.book.update({ where: { id: current.id }, data }));
      },
    }),

    route({
      method: 'delete',
      path: '/reading/books/:id',
      tag,
      summary: 'Remover livro',
      description: 'Apaga também os registros de leitura e as citações do livro.',
      params: idParams,
      async handler({ userId, params }) {
        const book = await findBook(userId, params.id);
        const logs = await db.readingLog.findMany({
          where: { bookId: book.id },
          select: { timeEntryId: true },
        });
        for (const log of logs) await dropTimeEntry(db, userId, log.timeEntryId);
        await db.book.delete({ where: { id: book.id } });
      },
    }),

    // ---- registros de leitura --------------------------------------------------------------
    route({
      method: 'get',
      path: '/reading/books/:id/logs',
      tag,
      summary: 'Registros de leitura do livro',
      params: idParams,
      response: z.array(readingLogSchema),
      async handler({ userId, params }) {
        const book = await findBook(userId, params.id);
        const logs = await db.readingLog.findMany({
          where: { bookId: book.id },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
        return logs.map(toLogDto);
      },
    }),

    route({
      method: 'post',
      path: '/reading/books/:id/logs',
      tag,
      summary: 'Registrar uma sessão de leitura',
      description:
        'Informe `pagesRead` ou a página em que parou (`endPage`). A página atual do livro avança, o livro passa a "lendo" ' +
        'e, ao chegar na última página, a "concluído". Com `minutes`, o tempo entra também no registro de tempo.',
      params: idParams,
      body: createReadingLogInputSchema,
      response: readingLogSchema,
      async handler({ userId, params, body }) {
        const book = await findBook(userId, params.id);
        const user = await userClock(db, userId);
        const date = body.date ?? user.today;
        if (date > user.today)
          throw badRequest('Não é possível registrar uma leitura em um dia futuro.');

        const pagesRead = body.pagesRead ?? Math.max(0, (body.endPage ?? 0) - book.currentPage);
        const reached = body.endPage ?? book.currentPage + pagesRead;
        const currentPage = Math.max(
          book.currentPage,
          book.totalPages ? Math.min(reached, book.totalPages) : reached,
        );
        const finished = !!book.totalPages && currentPage >= book.totalPages;

        const timeEntryId = await syncTimeEntry(db, userId, {
          entryId: null,
          minutes: body.minutes,
          date,
          kind: 'reading',
          title: book.title,
          timezone: user.timezone,
          goalId: book.goalId,
          bookId: book.id,
        });
        const log = await db.readingLog.create({
          data: {
            userId,
            bookId: book.id,
            date: dayToDate(date),
            pagesRead,
            minutes: body.minutes ?? null,
            note: body.note ?? null,
            timeEntryId,
          },
        });
        await db.book.update({
          where: { id: book.id },
          data: {
            currentPage,
            status: finished ? 'finished' : book.status === 'finished' ? 'finished' : 'reading',
            startedAt: book.startedAt ?? dayToDate(date),
            ...(finished && !book.finishedAt ? { finishedAt: dayToDate(date) } : {}),
          },
        });
        return toLogDto(log);
      },
    }),

    route({
      method: 'delete',
      path: '/reading/logs/:id',
      tag,
      summary: 'Apagar um registro de leitura',
      description: 'Desfaz as páginas na posição do livro e o tempo registrado.',
      params: idParams,
      async handler({ userId, params }) {
        const log = await db.readingLog.findFirst({ where: { id: params.id, userId } });
        if (!log) throw notFound();
        const book = await db.book.findUniqueOrThrow({ where: { id: log.bookId } });
        await dropTimeEntry(db, userId, log.timeEntryId);
        await db.readingLog.delete({ where: { id: log.id } });
        await db.book.update({
          where: { id: book.id },
          data: { currentPage: Math.max(0, book.currentPage - log.pagesRead) },
        });
      },
    }),

    // ---- citações --------------------------------------------------------------------------
    route({
      method: 'get',
      path: '/reading/books/:id/quotes',
      tag,
      summary: 'Citações do livro',
      params: idParams,
      response: z.array(bookQuoteSchema),
      async handler({ userId, params }) {
        const book = await findBook(userId, params.id);
        const quotes = await db.bookQuote.findMany({
          where: { bookId: book.id },
          orderBy: { createdAt: 'desc' },
        });
        return quotes.map(toQuoteDto);
      },
    }),

    route({
      method: 'post',
      path: '/reading/books/:id/quotes',
      tag,
      summary: 'Guardar uma citação',
      params: idParams,
      body: createQuoteInputSchema,
      response: bookQuoteSchema,
      async handler({ userId, params, body }) {
        const book = await findBook(userId, params.id);
        const quote = await db.bookQuote.create({
          data: {
            userId,
            bookId: book.id,
            text: body.text,
            page: body.page ?? null,
            note: body.note ?? null,
          },
        });
        return toQuoteDto(quote);
      },
    }),

    route({
      method: 'patch',
      path: '/reading/quotes/:id',
      tag,
      summary: 'Editar citação',
      params: idParams,
      body: updateQuoteInputSchema,
      response: bookQuoteSchema,
      async handler({ userId, params, body }) {
        if (!(await db.bookQuote.findFirst({ where: { id: params.id, userId } }))) throw notFound();
        return toQuoteDto(
          await db.bookQuote.update({ where: { id: params.id }, data: defined(body) }),
        );
      },
    }),

    route({
      method: 'delete',
      path: '/reading/quotes/:id',
      tag,
      summary: 'Apagar citação',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.bookQuote.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),
  ];
}
