/**
 * Demo-only calculations. In the real product these rules live in API services
 * (habits, goals, finance, day); they are reproduced here only so the demo responds like the API.
 */
import {
  type Account,
  type AgendaItem,
  type CalendarEvent,
  type DayItem,
  type DayOverview,
  type FinanceOverview,
  type Goal,
  type Habit,
  type Project,
} from '@ritmo/shared';
import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  format,
  parseISO,
  startOfDay,
  subDays,
  subMonths,
} from 'date-fns';
import type { DemoDb, HabitRecord, ProjectRecord } from './store';

const key = (d: Date) => format(d, 'yyyy-MM-dd');

export function accountBalances(db: DemoDb): Account[] {
  return db.accounts.map((account) => {
    let balance = account.initialBalanceCents;
    for (const t of db.transactions) {
      if (t.type === 'income' && t.accountId === account.id) balance += t.amountCents;
      if (t.type === 'expense' && t.accountId === account.id) balance -= t.amountCents;
      if (t.type === 'transfer') {
        if (t.accountId === account.id) balance -= t.amountCents;
        if (t.toAccountId === account.id) balance += t.amountCents;
      }
    }
    return { ...account, balanceCents: balance };
  });
}

export function habitView(db: DemoDb, record: HabitRecord, today = new Date()): Habit {
  const checks = new Map(
    db.checkins.filter((c) => c.habitId === record.id).map((c) => [c.date, c.status] as const),
  );
  const scheduled = (d: Date) => record.weekdays.includes(d.getDay());

  // Current streak: walk back over scheduled days. "skipped" neither counts nor breaks.
  // A scheduled day with no record only breaks the streak once the day is over.
  let currentStreak = 0;
  for (let back = 0; back < 400; back++) {
    const d = subDays(today, back);
    if (!scheduled(d)) continue;
    const status = checks.get(key(d));
    if (status === 'done') currentStreak++;
    else if (status === 'skipped') continue;
    else if (back === 0) continue;
    else break;
  }

  let bestStreak = 0;
  let run = 0;
  for (let back = 400; back >= 0; back--) {
    const d = subDays(today, back);
    if (!scheduled(d)) continue;
    const status = checks.get(key(d));
    if (status === 'done') {
      run++;
      bestStreak = Math.max(bestStreak, run);
    } else if (status !== 'skipped' && back > 0) run = 0;
  }

  let due = 0;
  let done = 0;
  for (let back = 1; back <= 30; back++) {
    const d = subDays(today, back);
    if (!scheduled(d)) continue;
    const status = checks.get(key(d));
    if (status === 'skipped') continue;
    due++;
    if (status === 'done') done++;
  }

  return {
    ...record,
    stats: { currentStreak, bestStreak, rate30d: due === 0 ? 0 : done / due },
  };
}

export function goalView(db: DemoDb, goal: Goal): Goal {
  const accounts = accountBalances(db);
  const linked = goal.linkedAccountId
    ? accounts.find((a) => a.id === goal.linkedAccountId)
    : undefined;
  const metric = goal.metric
    ? { ...goal.metric, current: linked ? Math.max(0, linked.balanceCents) : goal.metric.current }
    : null;

  let progress = goal.progress;
  if (goal.progressMode === 'milestones' && goal.milestones.length > 0) {
    progress = (goal.milestones.filter((m) => m.done).length / goal.milestones.length) * 100;
  } else if (goal.progressMode === 'metric' && metric) {
    progress = Math.min(100, (metric.current / metric.target) * 100);
  }

  const linkedTasks = db.tasks.filter((t) => t.goalId === goal.id);
  return {
    ...goal,
    metric,
    progress: Math.round(progress),
    openTaskCount: Math.max(goal.openTaskCount, linkedTasks.filter((t) => t.status !== 'done').length),
    doneTaskCount: Math.max(goal.doneTaskCount, linkedTasks.filter((t) => t.status === 'done').length),
  };
}

export function financeOverview(db: DemoDb, month: string): FinanceOverview {
  const accounts = accountBalances(db);
  const inMonth = (date: string) => date.startsWith(month);
  const monthStart = `${month}-01`;

  let incomeCents = 0;
  let expenseCents = 0;
  const byCategory = new Map<string | null, number>();
  for (const t of db.transactions) {
    if (!inMonth(t.date)) continue;
    // Transfers between own accounts are never income nor expense.
    if (t.type === 'income') incomeCents += t.amountCents;
    if (t.type === 'expense') {
      expenseCents += t.amountCents;
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amountCents);
    }
  }

  const sum = (pred: (a: Account) => boolean) =>
    accounts.filter(pred).reduce((acc, a) => acc + a.balanceCents, 0);

  let openingBalanceCents = db.accounts.reduce((acc, a) => acc + a.initialBalanceCents, 0);
  for (const t of db.transactions) {
    if (t.date >= monthStart) continue;
    if (t.type === 'income') openingBalanceCents += t.amountCents;
    if (t.type === 'expense') openingBalanceCents -= t.amountCents;
  }

  const monthly = [] as FinanceOverview['monthly'];
  const base = parseISO(`${month}-01`);
  for (let i = 5; i >= 0; i--) {
    const m = format(subMonths(base, i), 'yyyy-MM');
    let inc = 0;
    let exp = 0;
    for (const t of db.transactions) {
      if (!t.date.startsWith(m)) continue;
      if (t.type === 'income') inc += t.amountCents;
      if (t.type === 'expense') exp += t.amountCents;
    }
    monthly.push({ month: m, incomeCents: inc, expenseCents: exp });
  }

  const nameOf = (id: string | null) => db.categories.find((c) => c.id === id)?.name ?? 'Sem categoria';

  return {
    month,
    openingBalanceCents,
    incomeCents,
    expenseCents,
    reservedCents: sum((a) => a.isReserved),
    availableCents: sum((a) => !a.isReserved),
    expensesByCategory: [...byCategory.entries()]
      .map(([categoryId, amountCents]) => ({ categoryId, name: nameOf(categoryId), amountCents }))
      .sort((a, b) => b.amountCents - a.amountCents),
    monthly,
    budgets: db.budgets
      .filter((b) => b.month === month)
      .map((b) => ({ ...b, spentCents: byCategory.get(b.categoryId) ?? 0 })),
  };
}

export function dayOverview(db: DemoDb, date: string): DayOverview {
  const day = parseISO(date);
  const focus = db.focus[date] ?? [];
  const items: DayItem[] = [];

  for (const { event: e, start, end } of expandEvents(db.events, day, day)) {
    items.push({
      id: `event:${e.id}`,
      kind: 'event',
      refId: e.id,
      title: e.title,
      areaId: e.areaId,
      goalId: e.goalId,
      start: start.toISOString(),
      durationMinutes: Math.round((end.getTime() - start.getTime()) / 60000),
      status: e.status === 'done' ? 'done' : e.status === 'cancelled' ? 'skipped' : 'pending',
      priority: null,
      isFocus: false,
      overdue: false,
    });
  }

  for (const t of db.tasks) {
    const scheduledToday = t.scheduledStart ? key(new Date(t.scheduledStart)) === date : false;
    const dueToday = t.dueDate === date;
    const overdue = !!t.dueDate && t.dueDate < date && t.status !== 'done';
    if (!scheduledToday && !dueToday && !overdue) continue;
    items.push({
      id: `task:${t.id}`,
      kind: 'task',
      refId: t.id,
      title: t.title,
      areaId: t.areaId,
      goalId: t.goalId,
      start: t.scheduledStart,
      durationMinutes: t.estimateMinutes,
      status: t.status === 'done' ? 'done' : 'pending',
      priority: t.priority,
      isFocus: focus.includes(t.id),
      overdue,
    });
  }

  for (const h of db.habits) {
    if (h.status !== 'active' || !h.weekdays.includes(day.getDay())) continue;
    const check = db.checkins.find((c) => c.habitId === h.id && c.date === date);
    // A habit that already has a task of the same title today is not repeated on the timeline.
    if (items.some((i) => i.kind === 'task' && i.title.toLowerCase().startsWith(h.name.toLowerCase())))
      continue;
    let start: string | null = null;
    if (h.suggestedTime) {
      const [hh = 0, mm = 0] = h.suggestedTime.split(':').map(Number);
      const s = new Date(day);
      s.setHours(hh, mm, 0, 0);
      start = s.toISOString();
    }
    items.push({
      id: `habit:${h.id}`,
      kind: 'habit',
      refId: h.id,
      title: h.name,
      areaId: h.areaId,
      goalId: h.goalId,
      start,
      durationMinutes: h.targetType === 'duration' ? h.targetValue : null,
      status: check?.status === 'done' ? 'done' : check?.status === 'skipped' ? 'skipped' : 'pending',
      priority: null,
      isFocus: false,
      overdue: false,
    });
  }

  items.sort((a, b) => {
    if (a.start && b.start) return a.start.localeCompare(b.start);
    if (a.start) return -1;
    if (b.start) return 1;
    return a.title.localeCompare(b.title);
  });

  const countable = items.filter((i) => i.status !== 'skipped');
  const planned = items.reduce((acc, i) => acc + (i.status === 'skipped' ? 0 : i.durationMinutes ?? 0), 0);
  const spent = db.timeEntries.filter((e) => e.date === date).reduce((acc, e) => acc + e.minutes, 0);
  const tasks = items.filter((i) => i.kind === 'task');
  const habits = items.filter((i) => i.kind === 'habit');

  return {
    date,
    focusTaskIds: focus,
    items,
    summary: {
      eventsCount: items.filter((i) => i.kind === 'event').length,
      tasksPending: tasks.filter((i) => i.status === 'pending').length,
      tasksDone: tasks.filter((i) => i.status === 'done').length,
      habitsScheduled: habits.length,
      habitsDone: habits.filter((i) => i.status === 'done').length,
      activeGoals: db.goals.filter((g) => g.status === 'active').length,
      plannedMinutes: planned,
      spentMinutes: spent,
      capacityMinutes: db.user.dailyCapacityMinutes,
      completionRate:
        countable.length === 0 ? 0 : countable.filter((i) => i.status === 'done').length / countable.length,
    },
    reflection: db.reflections[date] ?? null,
  };
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const;

interface Occurrence {
  event: CalendarEvent;
  start: Date;
  end: Date;
}

/** Supports `FREQ=DAILY` and `FREQ=WEEKLY[;BYDAY=…]`, the presets the interface offers. */
function recurrenceMatches(rule: string, day: Date, base: Date): boolean {
  const parts = Object.fromEntries(rule.split(';').map((p) => p.split('=') as [string, string]));
  if (parts.FREQ === 'DAILY') return true;
  if (parts.FREQ === 'WEEKLY') {
    return parts.BYDAY
      ? parts.BYDAY.split(',').includes(DAY_CODES[day.getDay()]!)
      : day.getDay() === base.getDay();
  }
  return false;
}

/** Occurrences of events whose time overlaps the days `from`..`to` (inclusive, local time). */
export function expandEvents(events: CalendarEvent[], from: Date, to: Date): Occurrence[] {
  const rangeStart = startOfDay(from);
  const rangeEnd = endOfDay(to);
  const out: Occurrence[] = [];
  for (const event of events) {
    const baseStart = new Date(event.start);
    const duration = new Date(event.end).getTime() - baseStart.getTime();
    if (!event.recurrence) {
      const end = new Date(event.end);
      if (baseStart < rangeEnd && end > rangeStart) out.push({ event, start: baseStart, end });
      continue;
    }
    for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1)) {
      if (d < startOfDay(baseStart) || !recurrenceMatches(event.recurrence, d, baseStart)) continue;
      const start = new Date(d);
      start.setHours(baseStart.getHours(), baseStart.getMinutes(), 0, 0);
      out.push({ event, start, end: new Date(start.getTime() + duration) });
    }
  }
  return out;
}

export function agendaItems(db: DemoDb, fromKey: string, toKey: string): AgendaItem[] {
  const from = parseISO(fromKey);
  const to = parseISO(toKey);
  const items: AgendaItem[] = [];

  for (const { event, start, end } of expandEvents(db.events, from, to)) {
    items.push({
      id: `event:${event.id}:${start.toISOString()}`,
      kind: 'event',
      refId: event.id,
      title: event.title,
      areaId: event.areaId,
      start: start.toISOString(),
      end: end.toISOString(),
      allDay: event.allDay,
      status: event.status,
      recurring: !!event.recurrence,
      conflict: false,
      recurrence: event.recurrence,
      location: event.location,
      reminderMinutes: event.reminderMinutes,
    });
  }

  for (const task of db.tasks) {
    if (!task.scheduledStart) continue;
    const start = new Date(task.scheduledStart);
    if (start < startOfDay(from) || start > endOfDay(to)) continue;
    items.push({
      id: `task:${task.id}:${task.scheduledStart}`,
      kind: 'task',
      refId: task.id,
      title: task.title,
      areaId: task.areaId,
      start: start.toISOString(),
      end: new Date(start.getTime() + (task.estimateMinutes ?? 30) * 60_000).toISOString(),
      allDay: false,
      status: task.status === 'done' ? 'done' : 'scheduled',
      recurring: false,
      conflict: false,
      recurrence: null,
      location: null,
      reminderMinutes: null,
    });
  }

  // Two non-cancelled, timed blocks that overlap are both flagged as conflicting.
  const timed = items.filter((i) => i.status !== 'cancelled' && !i.allDay);
  for (let a = 0; a < timed.length; a++) {
    for (let b = a + 1; b < timed.length; b++) {
      const x = timed[a]!;
      const y = timed[b]!;
      if (x.start < y.end && y.start < x.end) {
        x.conflict = true;
        y.conflict = true;
      }
    }
  }
  return items.sort((x, y) => x.start.localeCompare(y.start));
}

export function projectView(db: DemoDb, project: ProjectRecord): Project {
  const tasks = db.tasks.filter((t) => t.projectId === project.id);
  const done = tasks.filter((t) => t.status === 'done').length;
  return {
    ...project,
    openTaskCount: tasks.length - done,
    doneTaskCount: done,
    progress: tasks.length === 0 ? 0 : Math.round((done / tasks.length) * 100),
  };
}

export function daysUntil(date: string, from = new Date()): number {
  return differenceInCalendarDays(parseISO(date), from);
}

export { addDays };
