import {
  idSchema,
  listNotificationsQuerySchema,
  notificationPreferencesSchema,
  notificationSchema,
  pushSubscriptionInputSchema,
  updateNotificationPreferencesInputSchema,
  type Notification as NotificationDto,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Deps } from '../../core/deps';
import { notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import type { Notification } from '../../generated/prisma/client';

const toDto = (n: Notification): NotificationDto => ({
  id: n.id,
  type: n.type,
  title: n.title,
  body: n.body,
  link: n.link,
  read: n.readAt !== null,
  createdAt: n.createdAt.toISOString(),
});

export function notificationsRoutes({ db }: Deps): AnyRoute[] {
  const idParams = z.object({ id: idSchema });

  async function preferences(userId: string) {
    const prefs = await db.notificationPreference.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
    return {
      eventReminders: prefs.eventReminders,
      taskDue: prefs.taskDue,
      habitReminders: prefs.habitReminders,
      reviews: prefs.reviews,
      goalDeadlines: prefs.goalDeadlines,
    };
  }

  return [
    route({
      method: 'get',
      path: '/notifications',
      tag: 'Notificações',
      summary: 'Central de notificações',
      description:
        'Da mais recente para a mais antiga. Lembretes são gerados pelo agendador do servidor.',
      query: listNotificationsQuerySchema,
      response: z.array(notificationSchema),
      async handler({ userId, query }) {
        const rows = await db.notification.findMany({
          where: { userId, ...(query.unread ? { readAt: null } : {}) },
          orderBy: { createdAt: 'desc' },
          take: query.limit,
        });
        return rows.map(toDto);
      },
    }),

    route({
      method: 'get',
      path: '/notifications/unread-count',
      tag: 'Notificações',
      summary: 'Quantidade de não lidas',
      response: z.object({ count: z.number().int() }),
      async handler({ userId }) {
        return { count: await db.notification.count({ where: { userId, readAt: null } }) };
      },
    }),

    route({
      method: 'post',
      path: '/notifications/read-all',
      tag: 'Notificações',
      summary: 'Marcar todas como lidas',
      async handler({ userId }) {
        await db.notification.updateMany({
          where: { userId, readAt: null },
          data: { readAt: clock.now() },
        });
      },
    }),

    route({
      method: 'get',
      path: '/notifications/preferences',
      tag: 'Notificações',
      summary: 'Preferências de notificação',
      response: notificationPreferencesSchema,
      handler: ({ userId }) => preferences(userId),
    }),

    route({
      method: 'put',
      path: '/notifications/preferences',
      tag: 'Notificações',
      summary: 'Atualizar preferências de notificação',
      body: updateNotificationPreferencesInputSchema,
      response: notificationPreferencesSchema,
      async handler({ userId, body }) {
        await db.notificationPreference.upsert({
          where: { userId },
          create: { userId, ...body },
          update: body,
        });
        return preferences(userId);
      },
    }),

    route({
      method: 'post',
      path: '/notifications/push-subscriptions',
      tag: 'Notificações',
      summary: 'Registrar inscrição de web push',
      description:
        'Guarda a inscrição do navegador. O envio real de push fica fora da primeira versão; a base já está pronta.',
      body: pushSubscriptionInputSchema,
      async handler({ userId, body, req }) {
        const data = {
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          userAgent: req.headers['user-agent']?.slice(0, 255) ?? null,
        };
        await db.pushSubscription.upsert({
          where: { userId_endpoint: { userId, endpoint: body.endpoint } },
          create: { userId, endpoint: body.endpoint, ...data },
          update: data,
        });
      },
    }),

    route({
      method: 'delete',
      path: '/notifications/push-subscriptions',
      tag: 'Notificações',
      summary: 'Remover inscrição de web push',
      body: z.object({ endpoint: z.url().max(500) }),
      async handler({ userId, body }) {
        await db.pushSubscription.deleteMany({ where: { userId, endpoint: body.endpoint } });
      },
    }),

    route({
      method: 'post',
      path: '/notifications/:id/read',
      tag: 'Notificações',
      summary: 'Marcar como lida',
      params: idParams,
      response: notificationSchema,
      status: 200,
      async handler({ userId, params }) {
        const found = await db.notification.findFirst({ where: { id: params.id, userId } });
        if (!found) throw notFound();
        return toDto(
          await db.notification.update({
            where: { id: found.id },
            data: { readAt: found.readAt ?? clock.now() },
          }),
        );
      },
    }),

    route({
      method: 'delete',
      path: '/notifications/:id',
      tag: 'Notificações',
      summary: 'Apagar notificação',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.notification.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),
  ];
}
