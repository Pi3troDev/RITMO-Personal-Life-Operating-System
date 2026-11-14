import {
  captureResultSchema,
  convertInboxInputSchema,
  createCaptureInputSchema,
  idSchema,
  inboxItemSchema,
  type InboxItem as InboxDto,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Deps } from '../../core/deps';
import { badRequest, notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { userClock } from '../../core/ownership';
import { dayToDate } from '../../core/time';
import type { InboxItem } from '../../generated/prisma/client';
import type { TasksService } from '../tasks/tasks.service';
import { toTaskDto } from '../tasks/task.mapper';

const toInboxDto = (i: InboxItem): InboxDto => ({
  id: i.id,
  kind: i.kind,
  text: i.text,
  createdAt: i.createdAt.toISOString(),
  processedAt: i.processedAt?.toISOString() ?? null,
});

export function captureRoutes({ db }: Deps, tasks: TasksService): AnyRoute[] {
  const idParams = z.object({ id: idSchema });

  async function findPending(userId: string, id: string) {
    const item = await db.inboxItem.findFirst({ where: { id, userId, status: 'pending' } });
    if (!item) throw notFound();
    return item;
  }

  const close = (id: string, status: 'converted' | 'discarded') =>
    db.inboxItem.update({ where: { id }, data: { status, processedAt: clock.now() } });

  return [
    route({
      method: 'post',
      path: '/capture',
      tag: 'Captura',
      summary: 'Captura rápida',
      description:
        'Uma tarefa capturada vira tarefa de verdade na hora ("A fazer", sem data). Os outros tipos ' +
        '(ideia, compromisso, despesa, anotação, objetivo) caem na caixa de entrada para serem classificados depois.',
      body: createCaptureInputSchema,
      response: captureResultSchema,
      async handler({ userId, body }) {
        if (body.kind === 'task') {
          const task = await tasks.create(userId, { title: body.text });
          return { destination: 'task' as const, taskId: task.id };
        }
        const item = await db.inboxItem.create({
          data: { userId, kind: body.kind, text: body.text },
        });
        return { destination: 'inbox' as const, item: toInboxDto(item) };
      },
    }),

    route({
      method: 'get',
      path: '/inbox',
      tag: 'Captura',
      summary: 'Caixa de entrada',
      description:
        'Itens capturados que ainda não foram classificados, do mais antigo ao mais novo.',
      response: z.array(inboxItemSchema),
      async handler({ userId }) {
        const items = await db.inboxItem.findMany({
          where: { userId, status: 'pending' },
          orderBy: { createdAt: 'asc' },
        });
        return items.map(toInboxDto);
      },
    }),

    route({
      method: 'post',
      path: '/inbox/:id/convert',
      tag: 'Captura',
      summary: 'Transformar em tarefa, compromisso ou objetivo',
      description: 'O texto capturado vira o título do novo item e o item sai da caixa de entrada.',
      params: idParams,
      body: convertInboxInputSchema,
      response: z.object({ to: z.enum(['task', 'event', 'goal']), id: idSchema }),
      status: 200,
      async handler({ userId, params, body }) {
        const item = await findPending(userId, params.id);

        if (body.to === 'task') {
          const task = await tasks.create(userId, { title: item.text });
          await close(item.id, 'converted');
          return { to: 'task' as const, id: toTaskDto(task).id };
        }
        if (body.to === 'event') {
          if (new Date(body.end) <= new Date(body.start))
            throw badRequest('O término precisa ser depois do início.');
          const event = await db.event.create({
            data: {
              userId,
              title: item.text,
              start: new Date(body.start),
              end: new Date(body.end),
            },
          });
          await close(item.id, 'converted');
          return { to: 'event' as const, id: event.id };
        }
        const user = await userClock(db, userId);
        const goal = await db.goal.create({
          data: {
            userId,
            name: item.text.slice(0, 120),
            category: body.category,
            startDate: dayToDate(user.today),
          },
        });
        await close(item.id, 'converted');
        return { to: 'goal' as const, id: goal.id };
      },
    }),

    route({
      method: 'post',
      path: '/inbox/:id/discard',
      tag: 'Captura',
      summary: 'Descartar item da caixa de entrada',
      params: idParams,
      async handler({ userId, params }) {
        const item = await findPending(userId, params.id);
        await close(item.id, 'discarded');
      },
    }),

    route({
      method: 'post',
      path: '/inbox/:id/done',
      tag: 'Captura',
      summary: 'Marcar como resolvido',
      description:
        'Para ideias, anotações e despesas já tratadas fora do app: tira da caixa sem criar nada.',
      params: idParams,
      async handler({ userId, params }) {
        const item = await findPending(userId, params.id);
        await close(item.id, 'converted');
      },
    }),
  ];
}
