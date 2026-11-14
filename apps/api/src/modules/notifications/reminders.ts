import type { Db } from '../../core/db';
import {
  addDays,
  endOfMonth,
  localDateOf,
  localMinutesOf,
  startOfWeek,
  weekdayOf,
  dayToDate,
} from '../../core/time';
import { loadOccurrences } from '../agenda/occurrences';

const HOUR = 60;

const hhmm = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

interface Draft {
  userId: string;
  type:
    | 'event_reminder'
    | 'task_due'
    | 'habit_reminder'
    | 'weekly_review'
    | 'monthly_review'
    | 'goal_deadline';
  title: string;
  body?: string;
  link: string;
  dedupeKey: string;
}

/**
 * Gera os lembretes que já deveriam ter aparecido até `now`. É idempotente: a `dedupeKey` única
 * garante que rodar a cada minuto (ou rodar de novo depois de uma pausa) nunca duplica nada.
 * Devolve quantas notificações novas foram criadas.
 */
export async function generateReminders(db: Db, now: Date): Promise<number> {
  const users = await db.user.findMany({
    include: { settings: true, notificationPreference: true },
  });
  let created = 0;

  for (const user of users) {
    const tz = user.settings?.timezone ?? 'America/Sao_Paulo';
    const weekStartsOn = user.settings?.weekStartsOn ?? 1;
    const prefs = user.notificationPreference;
    const today = localDateOf(now, tz);
    const minutesNow = localMinutesOf(now, tz);
    const drafts: Draft[] = [];

    if (prefs?.eventReminders ?? true) {
      const occurrences = await loadOccurrences(
        db,
        user.id,
        { timezone: tz, weekStartsOn },
        today,
        addDays(today, 1),
      );
      for (const o of occurrences) {
        if (o.status === 'cancelled' || o.event.reminderMinutes === null || o.event.allDay)
          continue;
        const remindAt = o.start.getTime() - o.event.reminderMinutes * 60_000;
        if (remindAt <= now.getTime() && now < o.start) {
          drafts.push({
            userId: user.id,
            type: 'event_reminder',
            title: o.event.title,
            body: `Começa às ${hhmm(localMinutesOf(o.start, tz))}${o.event.location ? ` · ${o.event.location}` : ''}`,
            link: '/agenda',
            dedupeKey: `event:${o.event.id}:${o.start.toISOString()}`,
          });
        }
      }
    }

    if ((prefs?.taskDue ?? true) && minutesNow >= 8 * HOUR) {
      const due = await db.task.findMany({
        where: { userId: user.id, status: { not: 'done' }, dueDate: dayToDate(today) },
        take: 20,
        select: { id: true, title: true },
      });
      for (const t of due) {
        drafts.push({
          userId: user.id,
          type: 'task_due',
          title: 'Tarefa vence hoje',
          body: t.title,
          link: '/tarefas',
          dedupeKey: `task_due:${t.id}:${today}`,
        });
      }
    }

    if (prefs?.habitReminders ?? true) {
      const habits = await db.habit.findMany({
        where: { userId: user.id, status: 'active', suggestedTime: { not: null } },
      });
      const checkedIn = new Set(
        (
          await db.habitCheckin.findMany({
            where: { userId: user.id, date: dayToDate(today) },
            select: { habitId: true },
          })
        ).map((c) => c.habitId),
      );
      for (const h of habits) {
        const weekdays = (h.weekdays as number[]) ?? [];
        if (!weekdays.includes(weekdayOf(today)) || checkedIn.has(h.id)) continue;
        const at =
          Number(h.suggestedTime!.slice(0, 2)) * HOUR + Number(h.suggestedTime!.slice(3, 5));
        if (minutesNow >= at - 10 && minutesNow <= at + 30) {
          drafts.push({
            userId: user.id,
            type: 'habit_reminder',
            title: h.name,
            body: `Hábito de hoje, sugerido para ${h.suggestedTime}`,
            link: '/habitos',
            dedupeKey: `habit:${h.id}:${today}`,
          });
        }
      }
    }

    if ((prefs?.reviews ?? true) && minutesNow >= 18 * HOUR) {
      const weekStart = startOfWeek(today, weekStartsOn);
      if (today === addDays(weekStart, 6)) {
        const done = await db.review.count({
          where: {
            userId: user.id,
            type: 'weekly',
            periodStart: dayToDate(weekStart),
            status: 'completed',
          },
        });
        if (!done) {
          drafts.push({
            userId: user.id,
            type: 'weekly_review',
            title: 'Hora da revisão semanal',
            body: 'Seus números da semana já estão prontos para revisar.',
            link: '/revisoes',
            dedupeKey: `weekly_review:${weekStart}`,
          });
        }
      }
      if (today === endOfMonth(today)) {
        const monthStart = `${today.slice(0, 7)}-01`;
        const done = await db.review.count({
          where: {
            userId: user.id,
            type: 'monthly',
            periodStart: dayToDate(monthStart),
            status: 'completed',
          },
        });
        if (!done) {
          drafts.push({
            userId: user.id,
            type: 'monthly_review',
            title: 'Hora da revisão mensal',
            body: 'O mês está acabando. Veja o que ele entregou.',
            link: '/revisoes',
            dedupeKey: `monthly_review:${monthStart}`,
          });
        }
      }
    }

    if (prefs?.goalDeadlines ?? true) {
      const checkpoints = [0, 1, 7].map((n) => addDays(today, n));
      const goals = await db.goal.findMany({
        where: {
          userId: user.id,
          status: 'active',
          targetDate: { in: checkpoints.map(dayToDate) },
        },
        select: { id: true, name: true, targetDate: true },
      });
      for (const g of goals) {
        const target = g.targetDate!.toISOString().slice(0, 10);
        const left = Math.round((Date.parse(target) - Date.parse(today)) / 86_400_000);
        drafts.push({
          userId: user.id,
          type: 'goal_deadline',
          title:
            left === 0
              ? 'A data-alvo de um objetivo é hoje'
              : `Faltam ${left} dia(s) para um objetivo`,
          body: g.name,
          link: '/objetivos',
          dedupeKey: `goal_deadline:${g.id}:${target}:${left}`,
        });
      }
    }

    if (drafts.length > 0) {
      const result = await db.notification.createMany({ data: drafts, skipDuplicates: true });
      created += result.count;
    }
  }
  return created;
}
