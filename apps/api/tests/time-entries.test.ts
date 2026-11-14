import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { as, freezeClock, NOW, registerUser, TODAY } from './helpers';

describe('registro de tempo', () => {
  let x: ReturnType<typeof as>;

  beforeAll(async () => {
    x = as(await registerUser());
  });
  afterEach(() => freezeClock());

  it('cronômetro: iniciar, pausar, retomar e parar somam só o tempo ativo', async () => {
    const task = (await x.post('/tasks', { title: 'Estudar', estimateMinutes: 60 })).body;
    freezeClock(NOW);
    const started = (await x.post('/time-entries/start', { taskId: task.id }).expect(201)).body;
    expect(started).toMatchObject({
      kind: 'task',
      title: 'Estudar',
      taskId: task.id,
      timerState: 'running',
      source: 'timer',
    });

    freezeClock(new Date(NOW.getTime() + 10 * 60_000));
    expect((await x.get('/time-entries/active')).body.durationSeconds).toBe(600); // rodando: já mostra o trecho corrente
    const paused = (await x.post(`/time-entries/${started.id}/pause`).expect(200)).body;
    expect(paused).toMatchObject({ timerState: 'paused', durationSeconds: 600 });

    freezeClock(new Date(NOW.getTime() + 40 * 60_000)); // 30 min de pausa não contam
    expect((await x.get('/time-entries/active')).body.durationSeconds).toBe(600);
    await x.post(`/time-entries/${started.id}/resume`).expect(200);

    freezeClock(new Date(NOW.getTime() + 55 * 60_000)); // +15 min ativos
    const stopped = (await x.post(`/time-entries/${started.id}/stop`).expect(200)).body;
    expect(stopped).toMatchObject({
      timerState: 'stopped',
      durationSeconds: 25 * 60,
      endedAt: expect.any(String),
    });
    expect((await x.get('/time-entries/active')).body).toBeNull();

    // o tempo alimenta a tarefa
    expect((await x.get(`/tasks/${task.id}`)).body.spentMinutes).toBe(25);
    await x.post(`/time-entries/${started.id}/stop`).expect(409);
  });

  it('só um cronômetro ativo por vez', async () => {
    freezeClock(NOW);
    const u = as(await registerUser());
    const first = (
      await u.post('/time-entries/start', { kind: 'study', title: 'Livro' }).expect(201)
    ).body;
    expect((await u.post('/time-entries/start', {})).status).toBe(409);
    await u.post(`/time-entries/${first.id}/pause`).expect(200);
    expect((await u.post('/time-entries/start', {})).status).toBe(409); // pausado também é ativo
    await u.post(`/time-entries/${first.id}/stop`).expect(200);
    await u.post('/time-entries/start', {}).expect(201);
  });

  it('lançamento manual copia área, objetivo e projeto da tarefa e soma na tarefa', async () => {
    freezeClock(NOW);
    const u = as(await registerUser());
    const area = (await u.get('/areas')).body[1].id;
    const goal = (await u.post('/goals', { name: 'g', category: 'academic' })).body.id;
    const project = (await u.post('/projects', { name: 'p' })).body.id;
    const task = (
      await u.post('/tasks', { title: 't', areaId: area, goalId: goal, projectId: project })
    ).body;

    const entry = (await u.post('/time-entries', { minutes: 45, taskId: task.id }).expect(201))
      .body;
    expect(entry).toMatchObject({
      areaId: area,
      goalId: goal,
      projectId: project,
      kind: 'task',
      durationSeconds: 2700,
      date: TODAY,
      source: 'manual',
      timerState: 'stopped',
    });
    expect((await u.get(`/tasks/${task.id}`)).body.spentMinutes).toBe(45);

    // corrigir e excluir reajustam a tarefa
    await u.patch(`/time-entries/${entry.id}`, { minutes: 30 }).expect(200);
    expect((await u.get(`/tasks/${task.id}`)).body.spentMinutes).toBe(30);
    await u.delete(`/time-entries/${entry.id}`).expect(204);
    expect((await u.get(`/tasks/${task.id}`)).body.spentMinutes).toBe(0);
  });

  it('lançamento em dia passado vai para aquele dia; dia futuro é recusado', async () => {
    freezeClock(NOW);
    const u = as(await registerUser());
    const past = (
      await u
        .post('/time-entries', { minutes: 20, date: '2026-11-10', kind: 'reading' })
        .expect(201)
    ).body;
    expect(past.date).toBe('2026-11-10');
    await u.post('/time-entries', { minutes: 20, date: '2026-11-25' }).expect(400);
    await u.post('/time-entries', { minutes: 0 }).expect(400);
    await u.post('/time-entries', { minutes: 24 * 60 + 1 }).expect(400);
    expect(
      ((await u.get('/time-entries?from=2026-11-10&to=2026-11-10')).body as unknown[]).length,
    ).toBe(1);
  });

  it('o tempo do dia aparece no resumo de Meu Dia e no relatório por área', async () => {
    freezeClock(NOW);
    const u = as(await registerUser());
    const [work, study] = (await u.get('/areas')).body as Array<{ id: string }>;
    await u.post('/time-entries', { minutes: 60, areaId: work!.id });
    await u.post('/time-entries', { minutes: 30, areaId: study!.id });
    await u.post('/time-entries', { minutes: 15 });
    expect((await u.get(`/day?date=${TODAY}`)).body.summary.spentMinutes).toBe(105);

    const report = (await u.get(`/reports/time?from=${TODAY}&to=${TODAY}&groupBy=area`).expect(200))
      .body;
    expect(report.totalMinutes).toBe(105);
    expect(
      report.groups.map((g: { label: string; minutes: number }) => [g.label, g.minutes]),
    ).toEqual([
      ['Trabalho', 60],
      ['Estudos', 30],
      ['Sem área', 15],
    ]);
    const byDay = (await u.get(`/reports/time?from=2026-11-01&to=${TODAY}&groupBy=day`)).body;
    expect(byDay.groups).toEqual([{ key: TODAY, id: null, label: TODAY, minutes: 105 }]);
    await u.get(`/reports/time?from=${TODAY}&to=2026-11-01`).expect(400);
  });
});
