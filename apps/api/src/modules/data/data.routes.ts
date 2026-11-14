import { z } from 'zod';
import { clock } from '../../core/clock';
import type { Deps } from '../../core/deps';
import { route, type AnyRoute } from '../../core/http/route';

export function dataRoutes({ db }: Deps): AnyRoute[] {
  return [
    route({
      method: 'get',
      path: '/export',
      tag: 'Dados',
      summary: 'Exportar todos os meus dados',
      description:
        'Baixa um JSON com tudo que pertence ao usuário (perfil, áreas, tarefas, agenda, hábitos, objetivos, finanças, ' +
        'tempo, reflexões, revisões, notificações). O hash da senha e as sessões nunca saem.',
      response: z.object({
        app: z.literal('ritmo'),
        version: z.literal(1),
        exportedAt: z.iso.datetime(),
        data: z.record(z.string(), z.unknown()),
      }),
      async handler({ userId, res }) {
        const where = { userId };
        const [
          user,
          areas,
          boards,
          columns,
          tasks,
          projects,
          events,
          eventExceptions,
          focus,
          reflections,
          inbox,
          habits,
          checkins,
          goals,
          milestones,
          progress,
          vision,
          accounts,
          categories,
          transactions,
          budgets,
          timeEntries,
          reviews,
          notifications,
          preferences,
        ] = await Promise.all([
          db.user.findUniqueOrThrow({
            where: { id: userId },
            select: { id: true, email: true, name: true, createdAt: true, settings: true },
          }),
          db.area.findMany({ where }),
          db.board.findMany({ where }),
          db.boardColumn.findMany({ where }),
          db.task.findMany({ where }),
          db.project.findMany({ where }),
          db.event.findMany({ where }),
          db.eventException.findMany({ where }),
          db.dailyFocusItem.findMany({ where }),
          db.dailyReflection.findMany({ where }),
          db.inboxItem.findMany({ where }),
          db.habit.findMany({ where }),
          db.habitCheckin.findMany({ where }),
          db.goal.findMany({ where }),
          db.milestone.findMany({ where }),
          db.goalProgressEntry.findMany({ where }),
          db.visionItem.findMany({ where }),
          db.account.findMany({ where }),
          db.financeCategory.findMany({ where }),
          db.transaction.findMany({ where }),
          db.budget.findMany({ where }),
          db.timeEntry.findMany({ where }),
          db.review.findMany({ where }),
          db.notification.findMany({ where }),
          db.notificationPreference.findUnique({ where }),
        ]);

        const exportedAt = clock.now();
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="ritmo-export-${exportedAt.toISOString().slice(0, 10)}.json"`,
        );
        return {
          app: 'ritmo' as const,
          version: 1 as const,
          exportedAt: exportedAt.toISOString(),
          data: {
            user,
            areas,
            boards,
            boardColumns: columns,
            tasks,
            projects,
            events,
            eventExceptions,
            dailyFocus: focus,
            dailyReflections: reflections,
            inbox,
            habits,
            habitCheckins: checkins,
            goals,
            milestones,
            goalProgress: progress,
            vision,
            accounts,
            financeCategories: categories,
            transactions,
            budgets,
            timeEntries,
            reviews,
            notifications,
            notificationPreferences: preferences,
          },
        };
      },
    }),
  ];
}
