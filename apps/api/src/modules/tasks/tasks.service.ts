import { randomUUID } from 'node:crypto';
import type { CreateTaskInput, UpdateTaskInput } from '@ritmo/shared';
import { clock } from '../../core/clock';
import type { Db } from '../../core/db';
import { badRequest, notFound } from '../../core/errors';
import { assertOwned, userClock } from '../../core/ownership';
import { isValidRule, nextOccurrence, parseRule } from '../../core/recurrence';
import { dateToDay, dayToDate, localDateOf, localMinutesOf, zonedInstant } from '../../core/time';
import type { Task, TaskStatus } from '../../generated/prisma/client';

const POSITION_STEP = 1000;

/** Regras de negócio de tarefas e quadros. Controllers só chamam estas funções. */
export function createTasksService(db: Db) {
  async function defaultBoard(userId: string) {
    const existing = await db.board.findFirst({
      where: { userId, isDefault: true },
      include: { columns: { orderBy: { position: 'asc' } } },
    });
    if (existing) return existing;
    // Rede de segurança: usuários criados pelo cadastro sempre têm quadro; isto cobre dados antigos.
    const { DEFAULT_COLUMNS } = await import('../auth/seed');
    return db.board.create({
      data: {
        userId,
        name: 'Meu quadro',
        isDefault: true,
        columns: {
          create: DEFAULT_COLUMNS.map((c, i) => ({
            userId,
            name: c.name,
            statusCategory: c.statusCategory,
            position: (i + 1) * POSITION_STEP,
          })),
        },
      },
      include: { columns: { orderBy: { position: 'asc' } } },
    });
  }

  async function nextPosition(columnId: string) {
    const last = await db.task.aggregate({ where: { columnId }, _max: { position: true } });
    return (last._max.position ?? 0) + POSITION_STEP;
  }

  /** Primeira coluna do quadro com a categoria de status pedida. */
  async function columnForStatus(boardId: string, status: TaskStatus) {
    const column = await db.boardColumn.findFirst({
      where: { boardId, statusCategory: status },
      orderBy: { position: 'asc' },
    });
    if (!column) throw badRequest('O quadro não tem uma coluna para este status.');
    return column;
  }

  async function assertRefs(
    userId: string,
    refs: { areaId?: string | null; projectId?: string | null; goalId?: string | null },
  ) {
    await assertOwned(db, 'area', userId, refs.areaId);
    await assertOwned(db, 'project', userId, refs.projectId);
    await assertOwned(db, 'goal', userId, refs.goalId);
  }

  function assertRecurrence(rule: string | null | undefined) {
    if (rule && !isValidRule(rule)) throw badRequest('A regra de recorrência é inválida.');
  }

  async function create(userId: string, input: CreateTaskInput): Promise<Task> {
    await assertRefs(userId, input);
    assertRecurrence(input.recurrence);

    let column;
    if (input.columnId) {
      column = await db.boardColumn.findFirst({ where: { id: input.columnId, userId } });
      if (!column) throw badRequest('Coluna inválida.');
    } else {
      const board = await defaultBoard(userId);
      column = await columnForStatus(board.id, 'todo');
    }

    return db.task.create({
      data: {
        userId,
        boardId: column.boardId,
        columnId: column.id,
        status: column.statusCategory,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority ?? 'none',
        areaId: input.areaId ?? null,
        projectId: input.projectId ?? null,
        goalId: input.goalId ?? null,
        position: await nextPosition(column.id),
        dueDate: input.dueDate ? dayToDate(input.dueDate) : null,
        scheduledStart: input.scheduledStart ? new Date(input.scheduledStart) : null,
        estimateMinutes: input.estimateMinutes ?? null,
        tags: input.tags ?? [],
        checklist: (input.checklist ?? []).map((item) => ({
          id: randomUUID(),
          title: item.title,
          done: false,
        })),
        recurrence: input.recurrence ?? null,
        notes: input.notes ?? null,
        completedAt: column.statusCategory === 'done' ? clock.now() : null,
      },
    });
  }

  async function update(userId: string, id: string, input: UpdateTaskInput): Promise<Task> {
    const current = await db.task.findFirst({ where: { id, userId } });
    if (!current) throw notFound();
    await assertRefs(userId, input);
    assertRecurrence(input.recurrence);

    // A coluna decide o status. Um status "solto" escolhe a primeira coluna com essa categoria.
    let target;
    if (input.columnId && input.columnId !== current.columnId) {
      target = await db.boardColumn.findFirst({ where: { id: input.columnId, userId } });
      if (!target) throw badRequest('Coluna inválida.');
    } else if (input.status && input.status !== current.status) {
      target = await columnForStatus(current.boardId, input.status);
    }

    const now = clock.now();
    const {
      status: _status,
      columnId: _columnId,
      checklist,
      dueDate,
      scheduledStart,
      ...rest
    } = input;
    const becameDone = !!target && target.statusCategory === 'done' && current.status !== 'done';

    const updated = await db.task.update({
      where: { id: current.id },
      data: {
        ...rest,
        ...(checklist ? { checklist } : {}),
        ...(dueDate !== undefined ? { dueDate: dueDate ? dayToDate(dueDate) : null } : {}),
        ...(scheduledStart !== undefined
          ? { scheduledStart: scheduledStart ? new Date(scheduledStart) : null }
          : {}),
        ...(target
          ? {
              boardId: target.boardId,
              columnId: target.id,
              status: target.statusCategory,
              completedAt: target.statusCategory === 'done' ? (current.completedAt ?? now) : null,
              position: input.position ?? (await nextPosition(target.id)),
            }
          : {}),
      },
    });

    if (becameDone && updated.recurrence) await spawnNextOccurrence(userId, updated);
    return updated;
  }

  /** Ao concluir uma tarefa recorrente, cria a próxima ocorrência (a série não acumula linhas futuras). */
  async function spawnNextOccurrence(userId: string, done: Task) {
    const rule = done.recurrence;
    if (!rule || !parseRule(rule)) return;
    const user = await userClock(db, userId);

    const anchorDay = done.dueDate
      ? dateToDay(done.dueDate)
      : done.scheduledStart
        ? localDateOf(done.scheduledStart, user.timezone)
        : user.today;
    const after = anchorDay > user.today ? anchorDay : user.today;
    const next = nextOccurrence(rule, anchorDay, after, user.weekStartsOn);
    if (!next) return;

    // COUNT é "quantas ocorrências no total": a cópia carrega o que restou.
    const parsed = parseRule(rule)!;
    let nextRule: string | null = rule;
    if (parsed.count !== null)
      nextRule = parsed.count <= 1 ? null : rule.replace(/COUNT=\d+/i, `COUNT=${parsed.count - 1}`);
    if (!nextRule) return;

    const column = await columnForStatus(done.boardId, 'todo');
    const checklist = ((done.checklist as Array<{ title: string }> | null) ?? []).map((c) => ({
      id: randomUUID(),
      title: c.title,
      done: false,
    }));

    await db.task.create({
      data: {
        userId,
        boardId: done.boardId,
        columnId: column.id,
        status: 'todo',
        title: done.title,
        description: done.description,
        priority: done.priority,
        areaId: done.areaId,
        projectId: done.projectId,
        goalId: done.goalId,
        position: await nextPosition(column.id),
        dueDate: done.dueDate || !done.scheduledStart ? dayToDate(next) : null,
        scheduledStart: done.scheduledStart
          ? zonedInstant(next, localMinutesOf(done.scheduledStart, user.timezone), user.timezone)
          : null,
        estimateMinutes: done.estimateMinutes,
        tags: done.tags ?? [],
        checklist,
        recurrence: nextRule,
        notes: done.notes,
      },
    });
  }

  return { defaultBoard, nextPosition, columnForStatus, create, update, assertRefs };
}

export type TasksService = ReturnType<typeof createTasksService>;
