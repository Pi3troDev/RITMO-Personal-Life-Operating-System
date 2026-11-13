import {
  createCaptureInputSchema,
  createEventInputSchema,
  createProjectInputSchema,
  createTaskInputSchema,
  updateEventInputSchema,
  updateProjectInputSchema,
  type CalendarEvent,
  createTransactionInputSchema,
  loginInputSchema,
  registerInputSchema,
  setFocusInputSchema,
  updateTaskInputSchema,
  upsertCheckinInputSchema,
  upsertReflectionInputSchema,
  upsertBudgetInputSchema,
  type Task,
} from '@ritmo/shared';
import { format } from 'date-fns';
import { http, HttpResponse, delay } from 'msw';
import {
  accountBalances,
  agendaItems,
  dayOverview,
  financeOverview,
  goalView,
  habitView,
  projectView,
} from './domain';
import { createDemoDb, type DemoDb, type ProjectRecord } from './store';

const SESSION_KEY = 'ritmo:demo-session';
const API = '/api/v1';

let db: DemoDb = createDemoDb();
let nextId = 1000;
const newId = (prefix: string) => `${prefix}-${++nextId}`;

function hasSession(): boolean {
  try {
    return localStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}
function setSession(on: boolean) {
  try {
    if (on) localStorage.setItem(SESSION_KEY, '1');
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage unavailable: the demo session just lasts until reload */
  }
}

const error = (status: number, code: string, message: string, details?: unknown) =>
  HttpResponse.json({ error: { code, message, details } }, { status });

const unauthorized = () => error(401, 'UNAUTHORIZED', 'Sua sessão expirou. Entre novamente.');
const notFound = () => error(404, 'NOT_FOUND', 'Não encontramos este item.');

function invalid(issues: { message: string; path: PropertyKey[] }[]) {
  return error(400, 'VALIDATION', issues[0]?.message ?? 'Dados inválidos.', issues);
}

/** Wraps a resolver so it answers 401 without a demo session and simulates a short latency. */
function guarded<T extends (...args: never[]) => Response | Promise<Response>>(handler: T) {
  return (async (...args: Parameters<T>) => {
    await delay(120);
    if (!hasSession()) return unauthorized();
    return handler(...args);
  }) as T;
}

function taskWithBoardStatus(task: Task, columnId: string): Task {
  const column = db.board.columns.find((c) => c.id === columnId);
  if (!column) return task;
  const done = column.statusCategory === 'done';
  return {
    ...task,
    columnId,
    status: column.statusCategory,
    completedAt: done ? (task.completedAt ?? new Date().toISOString()) : null,
  };
}

export const handlers = [
  // ---- auth ---------------------------------------------------------------------------------
  http.post(`${API}/auth/login`, async ({ request }) => {
    await delay(300);
    const parsed = loginInputSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error.issues);
    setSession(true);
    return HttpResponse.json({ accessToken: 'demo-token', user: db.user });
  }),
  http.post(`${API}/auth/register`, async ({ request }) => {
    await delay(300);
    const parsed = registerInputSchema.safeParse(await request.json());
    if (!parsed.success) return invalid(parsed.error.issues);
    db = createDemoDb();
    db.user = { ...db.user, name: parsed.data.name, email: parsed.data.email };
    setSession(true);
    return HttpResponse.json({ accessToken: 'demo-token', user: db.user }, { status: 201 });
  }),
  http.post(`${API}/auth/refresh`, async () => {
    await delay(80);
    if (!hasSession()) return unauthorized();
    return HttpResponse.json({ accessToken: 'demo-token', user: db.user });
  }),
  http.post(`${API}/auth/logout`, async () => {
    setSession(false);
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(`${API}/me`, guarded(() => HttpResponse.json(db.user))),

  // ---- areas --------------------------------------------------------------------------------
  http.get(`${API}/areas`, guarded(() => HttpResponse.json(db.areas))),

  // ---- day ----------------------------------------------------------------------------------
  http.get(
    `${API}/day`,
    guarded(({ request }: { request: Request }) => {
      const date = new URL(request.url).searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');
      return HttpResponse.json(dayOverview(db, date));
    }),
  ),
  http.put(
    `${API}/day/:date/focus`,
    guarded(async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
      const parsed = setFocusInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      db.focus[String(params.date)] = parsed.data.taskIds;
      return HttpResponse.json(dayOverview(db, String(params.date)));
    }),
  ),
  http.put(
    `${API}/day/:date/reflection`,
    guarded(async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
      const parsed = upsertReflectionInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const date = String(params.date);
      db.reflections[date] = { date, ...parsed.data, updatedAt: new Date().toISOString() };
      return HttpResponse.json(db.reflections[date]);
    }),
  ),
  http.get(
    `${API}/reflections`,
    guarded(() =>
      HttpResponse.json(Object.values(db.reflections).sort((a, b) => b.date.localeCompare(a.date))),
    ),
  ),

  // ---- tasks & board ------------------------------------------------------------------------
  http.get(`${API}/boards/default`, guarded(() => HttpResponse.json(db.board))),
  http.get(
    `${API}/tasks`,
    guarded(({ request }: { request: Request }) => {
      const search = new URL(request.url).searchParams;
      const view = search.get('view') ?? 'all';
      const projectId = search.get('projectId');
      const today = format(new Date(), 'yyyy-MM-dd');
      const open = (t: Task) => t.status !== 'done';
      const filters: Record<string, (t: Task) => boolean> = {
        all: () => true,
        today: (t) => open(t) && (t.dueDate === today || (t.scheduledStart?.startsWith(today) ?? false)),
        upcoming: (t) => open(t) && !!t.dueDate && t.dueDate > today,
        overdue: (t) => open(t) && !!t.dueDate && t.dueDate < today,
        done: (t) => !open(t),
      };
      const filter = filters[view] ?? filters.all!;
      return HttpResponse.json(
        db.tasks
          .filter((t) => (!projectId || t.projectId === projectId) && filter(t))
          .sort((a, b) => a.position - b.position),
      );
    }),
  ),
  http.post(
    `${API}/tasks`,
    guarded(async ({ request }: { request: Request }) => {
      const parsed = createTaskInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const input = parsed.data;
      const now = new Date().toISOString();
      const id = newId('task');
      const base: Task = {
        id,
        title: input.title,
        description: input.description ?? null,
        status: 'todo',
        priority: input.priority ?? 'none',
        areaId: input.areaId ?? null,
        projectId: input.projectId ?? null,
        goalId: input.goalId ?? null,
        boardId: db.board.id,
        columnId: 'col-todo',
        position: Date.now(),
        dueDate: input.dueDate ?? null,
        scheduledStart: input.scheduledStart ?? null,
        estimateMinutes: input.estimateMinutes ?? null,
        spentMinutes: 0,
        tags: input.tags ?? [],
        checklist: (input.checklist ?? []).map((c, i) => ({ id: `${id}-c${i}`, title: c.title, done: false })),
        recurrence: input.recurrence ?? null,
        notes: input.notes ?? null,
        completedAt: null,
        createdAt: now,
        updatedAt: now,
      };
      const task = taskWithBoardStatus(base, input.columnId ?? 'col-todo');
      db.tasks.push(task);
      return HttpResponse.json(task, { status: 201 });
    }),
  ),
  http.patch(
    `${API}/tasks/:id`,
    guarded(async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
      const parsed = updateTaskInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const index = db.tasks.findIndex((t) => t.id === params.id);
      const current = db.tasks[index];
      if (!current) return notFound();

      const { status, columnId, ...rest } = parsed.data;
      let next: Task = {
        ...current,
        ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)),
        updatedAt: new Date().toISOString(),
      } as Task;

      // The column decides the status. A bare status change picks the first column with it.
      const targetColumn =
        columnId ?? (status ? db.board.columns.find((c) => c.statusCategory === status)?.id : undefined);
      if (targetColumn) next = taskWithBoardStatus(next, targetColumn);
      db.tasks[index] = next;
      return HttpResponse.json(next);
    }),
  ),
  http.delete(
    `${API}/tasks/:id`,
    guarded(({ params }: { params: Record<string, unknown> }) => {
      const before = db.tasks.length;
      db.tasks = db.tasks.filter((t) => t.id !== params.id);
      return db.tasks.length === before ? notFound() : new HttpResponse(null, { status: 204 });
    }),
  ),

  // ---- habits -------------------------------------------------------------------------------
  http.get(
    `${API}/habits`,
    guarded(() => HttpResponse.json(db.habits.map((h) => habitView(db, h)))),
  ),
  http.get(
    `${API}/habits/checkins`,
    guarded(() => HttpResponse.json(db.checkins)),
  ),
  http.put(
    `${API}/habits/:id/checkins/:date`,
    guarded(async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
      const parsed = upsertCheckinInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const habit = db.habits.find((h) => h.id === params.id);
      if (!habit) return notFound();
      const date = String(params.date);
      db.checkins = db.checkins.filter((c) => !(c.habitId === habit.id && c.date === date));
      db.checkins.push({
        habitId: habit.id,
        date,
        status: parsed.data.status,
        value: parsed.data.value ?? habit.targetValue,
        note: parsed.data.note ?? null,
      });
      return HttpResponse.json(habitView(db, habit));
    }),
  ),
  http.delete(
    `${API}/habits/:id/checkins/:date`,
    guarded(({ params }: { params: Record<string, unknown> }) => {
      db.checkins = db.checkins.filter(
        (c) => !(c.habitId === params.id && c.date === String(params.date)),
      );
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // ---- goals --------------------------------------------------------------------------------
  http.get(`${API}/goals`, guarded(() => HttpResponse.json(db.goals.map((g) => goalView(db, g))))),
  http.patch(
    `${API}/goals/:goalId/milestones/:milestoneId`,
    guarded(async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
      const body = (await request.json()) as { done?: boolean };
      const goal = db.goals.find((g) => g.id === params.goalId);
      const milestone = goal?.milestones.find((m) => m.id === params.milestoneId);
      if (!goal || !milestone) return notFound();
      milestone.done = body.done ?? milestone.done;
      milestone.completedAt = milestone.done ? new Date().toISOString() : null;
      goal.lastActivityAt = new Date().toISOString();
      return HttpResponse.json(goalView(db, goal));
    }),
  ),

  // ---- finance ------------------------------------------------------------------------------
  http.get(
    `${API}/finance/overview`,
    guarded(({ request }: { request: Request }) => {
      const month = new URL(request.url).searchParams.get('month') ?? format(new Date(), 'yyyy-MM');
      return HttpResponse.json(financeOverview(db, month));
    }),
  ),
  http.get(`${API}/finance/accounts`, guarded(() => HttpResponse.json(accountBalances(db)))),
  http.get(`${API}/finance/categories`, guarded(() => HttpResponse.json(db.categories))),
  http.get(
    `${API}/finance/transactions`,
    guarded(({ request }: { request: Request }) => {
      const month = new URL(request.url).searchParams.get('month');
      const list = db.transactions
        .filter((t) => !month || t.date.startsWith(month))
        .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
      return HttpResponse.json(list);
    }),
  ),
  http.post(
    `${API}/finance/transactions`,
    guarded(async ({ request }: { request: Request }) => {
      const parsed = createTransactionInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const input = parsed.data;
      const accountIds = new Set(db.accounts.map((a) => a.id));
      if (!accountIds.has(input.accountId) || (input.toAccountId && !accountIds.has(input.toAccountId)))
        return error(400, 'VALIDATION', 'Conta inválida.');
      const created = {
        id: newId('tx'),
        type: input.type,
        description: input.description,
        amountCents: input.amountCents,
        date: input.date,
        categoryId: input.type === 'transfer' ? null : (input.categoryId ?? null),
        accountId: input.accountId,
        toAccountId: input.type === 'transfer' ? (input.toAccountId ?? null) : null,
        note: input.note ?? null,
        createdAt: new Date().toISOString(),
      };
      db.transactions.push(created);
      return HttpResponse.json(created, { status: 201 });
    }),
  ),
  http.put(
    `${API}/finance/budgets`,
    guarded(async ({ request }: { request: Request }) => {
      const parsed = upsertBudgetInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      db.budgets = db.budgets.filter(
        (b) => !(b.categoryId === parsed.data.categoryId && b.month === parsed.data.month),
      );
      db.budgets.push(parsed.data);
      return HttpResponse.json(financeOverview(db, parsed.data.month));
    }),
  ),

  // ---- agenda & events ----------------------------------------------------------------------
  http.get(
    `${API}/agenda`,
    guarded(({ request }: { request: Request }) => {
      const params = new URL(request.url).searchParams;
      const from = params.get('from');
      const to = params.get('to');
      if (!from || !to) return error(400, 'VALIDATION', 'Informe o período.');
      return HttpResponse.json(agendaItems(db, from, to));
    }),
  ),
  http.post(
    `${API}/events`,
    guarded(async ({ request }: { request: Request }) => {
      const parsed = createEventInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const input = parsed.data;
      const event: CalendarEvent = {
        id: newId('ev'),
        title: input.title,
        description: input.description ?? null,
        areaId: input.areaId ?? null,
        goalId: input.goalId ?? null,
        start: input.start,
        end: input.end,
        allDay: input.allDay ?? false,
        location: input.location ?? null,
        recurrence: input.recurrence ?? null,
        reminderMinutes: input.reminderMinutes ?? null,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };
      db.events.push(event);
      return HttpResponse.json(event, { status: 201 });
    }),
  ),
  http.patch(
    `${API}/events/:id`,
    guarded(async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
      const parsed = updateEventInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const event = db.events.find((e) => e.id === params.id);
      if (!event) return notFound();
      const { start, end, ...rest } = parsed.data;
      Object.assign(event, Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)));
      // A series keeps its first day; editing an occurrence changes the time of day for all of them.
      const keepDay = (base: string, source: string) => {
        const result = new Date(event.recurrence ? base : source);
        if (event.recurrence) {
          const time = new Date(source);
          result.setHours(time.getHours(), time.getMinutes(), 0, 0);
        }
        return result.toISOString();
      };
      if (start) event.start = keepDay(event.start, start);
      if (end) event.end = keepDay(event.end, end);
      return HttpResponse.json(event);
    }),
  ),
  http.delete(
    `${API}/events/:id`,
    guarded(({ params }: { params: Record<string, unknown> }) => {
      const before = db.events.length;
      db.events = db.events.filter((e) => e.id !== params.id);
      return db.events.length === before ? notFound() : new HttpResponse(null, { status: 204 });
    }),
  ),

  // ---- projects -----------------------------------------------------------------------------
  http.get(
    `${API}/projects`,
    guarded(() => HttpResponse.json(db.projects.map((p) => projectView(db, p)))),
  ),
  http.get(
    `${API}/projects/:id`,
    guarded(({ params }: { params: Record<string, unknown> }) => {
      const project = db.projects.find((p) => p.id === params.id);
      return project ? HttpResponse.json(projectView(db, project)) : notFound();
    }),
  ),
  http.post(
    `${API}/projects`,
    guarded(async ({ request }: { request: Request }) => {
      const parsed = createProjectInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const input = parsed.data;
      const project: ProjectRecord = {
        id: newId('proj'),
        name: input.name,
        description: input.description ?? null,
        areaId: input.areaId ?? null,
        goalId: input.goalId ?? null,
        status: 'active',
        dueDate: input.dueDate ?? null,
        createdAt: new Date().toISOString(),
      };
      db.projects.push(project);
      return HttpResponse.json(projectView(db, project), { status: 201 });
    }),
  ),
  http.patch(
    `${API}/projects/:id`,
    guarded(async ({ request, params }: { request: Request; params: Record<string, unknown> }) => {
      const parsed = updateProjectInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const project = db.projects.find((p) => p.id === params.id);
      if (!project) return notFound();
      Object.assign(project, Object.fromEntries(Object.entries(parsed.data).filter(([, v]) => v !== undefined)));
      return HttpResponse.json(projectView(db, project));
    }),
  ),

  // ---- quick capture ------------------------------------------------------------------------
  http.post(
    `${API}/capture`,
    guarded(async ({ request }: { request: Request }) => {
      const parsed = createCaptureInputSchema.safeParse(await request.json());
      if (!parsed.success) return invalid(parsed.error.issues);
      const { kind, text } = parsed.data;
      if (kind === 'task') {
        const now = new Date().toISOString();
        const task: Task = taskWithBoardStatus(
          {
            id: newId('task'),
            title: text,
            description: null,
            status: 'todo',
            priority: 'none',
            areaId: null,
            projectId: null,
            goalId: null,
            boardId: db.board.id,
            columnId: 'col-todo',
            position: Date.now(),
            dueDate: null,
            scheduledStart: null,
            estimateMinutes: null,
            spentMinutes: 0,
            tags: [],
            checklist: [],
            recurrence: null,
            notes: null,
            completedAt: null,
            createdAt: now,
            updatedAt: now,
          },
          'col-todo',
        );
        db.tasks.push(task);
        return HttpResponse.json({ destination: 'task', taskId: task.id }, { status: 201 });
      }
      const item = {
        id: newId('inbox'),
        kind,
        text,
        createdAt: new Date().toISOString(),
        processedAt: null,
      };
      db.inbox.push(item);
      return HttpResponse.json({ destination: 'inbox', item }, { status: 201 });
    }),
  ),
  http.get(
    `${API}/inbox`,
    guarded(() => HttpResponse.json(db.inbox.filter((i) => !i.processedAt))),
  ),
];
