import { beforeAll, describe, expect, it } from 'vitest';
import { as, freezeClock, registerUser, TODAY, type TestUser } from './helpers';

describe('tarefas, quadros e projetos', () => {
  let user: TestUser;
  let api: ReturnType<typeof as>;
  let columns: Record<string, string>;

  beforeAll(async () => {
    freezeClock();
    user = await registerUser();
    api = as(user);
    const board = (await api.get('/boards/default')).body;
    columns = Object.fromEntries(
      board.columns.map((c: { statusCategory: string; id: string }) => [c.statusCategory, c.id]),
    );
  });

  it('tarefa nova entra em "A fazer" do quadro padrão com valores padrão', async () => {
    const res = await api.post('/tasks', { title: '  Estudar inglês  ' }).expect(201);
    expect(res.body).toMatchObject({
      title: 'Estudar inglês',
      status: 'todo',
      priority: 'none',
      columnId: columns.todo,
      completedAt: null,
      spentMinutes: 0,
      tags: [],
      checklist: [],
      dueDate: null,
    });
  });

  it('valida entrada com mensagens em português', async () => {
    const res = await api.post('/tasks', { title: '   ' }).expect(400);
    expect(res.body.error).toMatchObject({ code: 'VALIDATION', message: 'Dê um título à tarefa' });
    await api.post('/tasks', { title: 'x', estimateMinutes: -5 }).expect(400);
    await api.post('/tasks', { title: 'x', dueDate: '18/11/2026' }).expect(400);
    await api.post('/tasks', { title: 'x', recurrence: 'FREQ=NUNCA' }).expect(400);
  });

  it('mover para uma coluna muda o status; concluir define completedAt; reabrir limpa', async () => {
    const task = (await api.post('/tasks', { title: 'Mover' })).body;
    const moved = (await api.patch(`/tasks/${task.id}`, { columnId: columns.in_progress })).body;
    expect(moved).toMatchObject({
      status: 'in_progress',
      columnId: columns.in_progress,
      completedAt: null,
    });

    const done = (await api.patch(`/tasks/${task.id}`, { status: 'done' })).body;
    expect(done).toMatchObject({ status: 'done', columnId: columns.done });
    expect(done.completedAt).toEqual(expect.any(String));

    const reopened = (await api.patch(`/tasks/${task.id}`, { status: 'todo' })).body;
    expect(reopened).toMatchObject({ status: 'todo', completedAt: null });
  });

  it('reordenar dentro da coluna usa position', async () => {
    const a = (await api.post('/tasks', { title: 'A' })).body;
    const b = (await api.post('/tasks', { title: 'B' })).body;
    expect(b.position).toBeGreaterThan(a.position);
    await api.patch(`/tasks/${b.id}`, { position: a.position - 1 }).expect(200);
    const list = (await api.get('/tasks?view=all')).body as Array<{ id: string }>;
    expect(list.findIndex((t) => t.id === b.id)).toBeLessThan(list.findIndex((t) => t.id === a.id));
  });

  it('checklist: cria com ids e substitui na edição', async () => {
    const task = (
      await api.post('/tasks', {
        title: 'Com checklist',
        checklist: [{ title: 'um' }, { title: 'dois' }],
      })
    ).body;
    expect(task.checklist).toHaveLength(2);
    expect(task.checklist[0]).toMatchObject({ title: 'um', done: false, id: expect.any(String) });
    const checked = (
      await api.patch(`/tasks/${task.id}`, { checklist: [{ ...task.checklist[0], done: true }] })
    ).body;
    expect(checked.checklist).toEqual([{ ...task.checklist[0], done: true }]);
  });

  it('visões: hoje, próximas, atrasadas e concluídas', async () => {
    const u = await registerUser();
    const x = as(u);
    const today = (await x.post('/tasks', { title: 'vence hoje', dueDate: TODAY })).body;
    const blocked = (
      await x.post('/tasks', { title: 'bloco hoje', scheduledStart: '2026-11-18T18:00:00.000Z' })
    ).body;
    const upcoming = (await x.post('/tasks', { title: 'amanhã', dueDate: '2026-11-19' })).body;
    const overdue = (await x.post('/tasks', { title: 'atrasada', dueDate: '2026-11-10' })).body;
    const done = (await x.post('/tasks', { title: 'feita', dueDate: '2026-11-10' })).body;
    await x.patch(`/tasks/${done.id}`, { status: 'done' });
    const titles = async (view: string) =>
      ((await x.get(`/tasks?view=${view}`)).body as Array<{ title: string }>)
        .map((t) => t.title)
        .sort();

    expect(await titles('today')).toEqual([blocked.title, today.title].sort());
    expect(await titles('upcoming')).toEqual([upcoming.title]);
    expect(await titles('overdue')).toEqual([overdue.title]);
    expect(await titles('done')).toEqual(['feita']);
    expect(await titles('all')).toHaveLength(5);
  });

  it('concluir tarefa recorrente cria a próxima ocorrência', async () => {
    const u = await registerUser();
    const x = as(u);
    const task = (
      await x.post('/tasks', {
        title: 'Treino',
        dueDate: TODAY,
        recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE',
        checklist: [{ title: 'aquecer' }],
      })
    ).body;
    await x.patch(`/tasks/${task.id}`, { status: 'done' }).expect(200);
    const all = (await x.get('/tasks?view=all')).body as Array<{
      id: string;
      status: string;
      dueDate: string;
      recurrence: string;
      checklist: Array<{ done: boolean }>;
    }>;
    expect(all).toHaveLength(2);
    const next = all.find((t) => t.id !== task.id)!;
    expect(next).toMatchObject({
      status: 'todo',
      dueDate: '2026-11-23',
      recurrence: 'FREQ=WEEKLY;BYDAY=MO,WE',
    });
    expect(next.checklist[0]!.done).toBe(false);

    // reabrir e concluir de novo a mesma tarefa não gera outra cópia por engano? (gera: é uma nova conclusão)
    await x.patch(`/tasks/${next.id}`, { status: 'done' }).expect(200);
    expect(((await x.get('/tasks?view=all')).body as unknown[]).length).toBe(3);
  });

  it('COUNT: a série termina quando acabam as ocorrências', async () => {
    const u = await registerUser();
    const x = as(u);
    const t1 = (
      await x.post('/tasks', { title: 'Curso', dueDate: TODAY, recurrence: 'FREQ=DAILY;COUNT=2' })
    ).body;
    await x.patch(`/tasks/${t1.id}`, { status: 'done' });
    const afterFirst = (await x.get('/tasks?view=all')).body as Array<{
      id: string;
      recurrence: string | null;
    }>;
    const t2 = afterFirst.find((t) => t.id !== t1.id)!;
    expect(t2.recurrence).toBe('FREQ=DAILY;COUNT=1'); // resta uma ocorrência
    await x.patch(`/tasks/${t2.id}`, { status: 'done' });
    expect(((await x.get('/tasks?view=all')).body as unknown[]).length).toBe(2);
  });

  it('colunas: não exclui coluna com tarefas sem destino; move e atualiza status', async () => {
    const u = await registerUser();
    const x = as(u);
    const board = (await x.get('/boards/default')).body;
    const extra = (
      await x.post(`/boards/${board.id}/columns`, {
        name: 'Bloqueado',
        statusCategory: 'in_progress',
      })
    ).body;
    const t = (await x.post('/tasks', { title: 'presa', columnId: extra.id })).body;
    expect(t.status).toBe('in_progress');

    const refuse = await x.delete(`/boards/${board.id}/columns/${extra.id}`);
    expect(refuse.status).toBe(409);
    expect(refuse.body.error.details).toEqual({ tasks: 1 });

    const doneCol = board.columns.find(
      (c: { statusCategory: string }) => c.statusCategory === 'done',
    ).id;
    await x.delete(`/boards/${board.id}/columns/${extra.id}?moveTo=${doneCol}`).expect(204);
    const moved = (await x.get(`/tasks/${t.id}`)).body;
    expect(moved).toMatchObject({ columnId: doneCol, status: 'done' });
    expect(moved.completedAt).not.toBeNull();
  });

  it('não permite excluir a última coluna de um status nem o quadro padrão', async () => {
    const u = await registerUser();
    const x = as(u);
    const board = (await x.get('/boards/default')).body;
    const todo = board.columns.find(
      (c: { statusCategory: string }) => c.statusCategory === 'todo',
    ).id;
    expect((await x.delete(`/boards/${board.id}/columns/${todo}`)).status).toBe(409);
    expect((await x.delete(`/boards/${board.id}`)).status).toBe(409);

    const other = (await x.post('/boards', { name: 'Outro' })).body;
    expect(other.columns).toHaveLength(5);
    await x.post('/tasks', { title: 'no outro', columnId: other.columns[1].id }).expect(201);
    expect((await x.delete(`/boards/${other.id}`)).status).toBe(409);
    await x.delete(`/boards/${other.id}?deleteTasks=true`).expect(204);
    expect(((await x.get('/tasks')).body as unknown[]).length).toBe(0);
  });

  it('projetos: progresso vem das tarefas e excluir não apaga as tarefas', async () => {
    const u = await registerUser();
    const x = as(u);
    const project = (await x.post('/projects', { name: 'Lançamento', dueDate: '2026-12-31' })).body;
    expect(project).toMatchObject({
      status: 'active',
      progress: 0,
      openTaskCount: 0,
      doneTaskCount: 0,
    });
    const t1 = (await x.post('/tasks', { title: 't1', projectId: project.id })).body;
    await x.post('/tasks', { title: 't2', projectId: project.id });
    await x.post('/tasks', { title: 't3', projectId: project.id });
    await x.post('/tasks', { title: 't4', projectId: project.id });
    await x.patch(`/tasks/${t1.id}`, { status: 'done' });
    expect((await x.get(`/projects/${project.id}`)).body).toMatchObject({
      openTaskCount: 3,
      doneTaskCount: 1,
      progress: 25,
    });
    expect(((await x.get(`/tasks?projectId=${project.id}`)).body as unknown[]).length).toBe(4);

    expect((await x.patch(`/projects/${project.id}`, { status: 'paused' })).body.status).toBe(
      'paused',
    );
    await x.delete(`/projects/${project.id}`).expect(204);
    const orphan = (await x.get(`/tasks/${t1.id}`)).body;
    expect(orphan.projectId).toBeNull();
  });

  it('captura rápida: tarefa vira tarefa; o resto cai na caixa de entrada e pode ser convertido', async () => {
    const u = await registerUser();
    const x = as(u);
    const cap = (await x.post('/capture', { kind: 'task', text: 'Ligar para o banco' })).body;
    expect(cap.destination).toBe('task');
    expect((await x.get(`/tasks/${cap.taskId}`)).body.title).toBe('Ligar para o banco');

    const idea = (await x.post('/capture', { kind: 'idea', text: 'App de receitas' })).body;
    expect(idea.destination).toBe('inbox');
    expect((await x.get('/inbox')).body).toHaveLength(1);

    const converted = (
      await x.post(`/inbox/${idea.item.id}/convert`, { to: 'goal', category: 'professional' })
    ).body;
    expect(converted.to).toBe('goal');
    expect((await x.get(`/goals/${converted.id}`)).body.name).toBe('App de receitas');
    expect((await x.get('/inbox')).body).toHaveLength(0);
    await x.post(`/inbox/${idea.item.id}/discard`).expect(404); // já processado
  });

  it('excluir tarefa responde 204 e depois 404', async () => {
    const t = (await api.post('/tasks', { title: 'efêmera' })).body;
    await api.delete(`/tasks/${t.id}`).expect(204);
    await api.delete(`/tasks/${t.id}`).expect(404);
    await api.get(`/tasks/${t.id}`).expect(404);
  });
});
