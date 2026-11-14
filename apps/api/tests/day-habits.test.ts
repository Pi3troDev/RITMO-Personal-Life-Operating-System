import { beforeAll, describe, expect, it } from 'vitest';
import { as, freezeClock, registerUser, TODAY, type TestUser } from './helpers';

const at = (day: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return new Date(Date.parse(`${day}T00:00:00Z`) + (h + 3) * 3_600_000 + m * 60_000).toISOString();
};

describe('Meu Dia', () => {
  let user: TestUser;
  let api: ReturnType<typeof as>;

  beforeAll(async () => {
    freezeClock();
    user = await registerUser();
    api = as(user);
  });

  it('dia vazio tem resumo zerado e a capacidade do usuário', async () => {
    const day = (await api.get(`/day?date=${TODAY}`).expect(200)).body;
    expect(day).toMatchObject({
      date: TODAY,
      focusTaskIds: [],
      items: [],
      reflection: null,
      summary: {
        eventsCount: 0,
        tasksPending: 0,
        habitsScheduled: 0,
        plannedMinutes: 0,
        capacityMinutes: 360,
        completionRate: 0,
      },
    });
  });

  it('junta compromissos, tarefas (do dia e atrasadas) e hábitos, ordenados por horário', async () => {
    const u = await registerUser();
    const x = as(u);
    await x.post('/events', {
      title: 'Reunião',
      start: at(TODAY, '10:00'),
      end: at(TODAY, '11:00'),
    });
    await x.post('/tasks', { title: 'Relatório', dueDate: TODAY, estimateMinutes: 90 });
    await x.post('/tasks', {
      title: 'Bloco',
      scheduledStart: at(TODAY, '08:00'),
      estimateMinutes: 30,
    });
    await x.post('/tasks', { title: 'Atrasada', dueDate: '2026-11-10', estimateMinutes: 20 });
    await x.post('/tasks', { title: 'Amanhã', dueDate: '2026-11-19' });
    await x.post('/habits', {
      name: 'Inglês',
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      suggestedTime: '07:00',
      targetType: 'duration',
      targetValue: 30,
      targetUnit: 'min',
    });
    await x.post('/habits', { name: 'Só domingo', weekdays: [0] });

    const day = (await x.get(`/day?date=${TODAY}`)).body;
    expect(day.items.map((i: { title: string }) => i.title)).toEqual([
      'Inglês',
      'Bloco',
      'Reunião',
      'Atrasada',
      'Relatório',
    ]);
    const late = day.items.find((i: { title: string }) => i.title === 'Atrasada');
    expect(late).toMatchObject({ overdue: true, kind: 'task', start: null });
    expect(day.items.find((i: { title: string }) => i.title === 'Inglês')).toMatchObject({
      kind: 'habit',
      durationMinutes: 30,
      start: at(TODAY, '07:00'),
    });
    expect(day.summary).toMatchObject({
      eventsCount: 1,
      tasksPending: 3,
      habitsScheduled: 1,
      plannedMinutes: 60 + 90 + 30 + 20 + 30,
    });
  });

  it('carga × capacidade: compara o planejado com a capacidade configurada', async () => {
    const u = await registerUser();
    const x = as(u);
    await x.patch('/me', { dailyCapacityMinutes: 120 }).expect(200);
    await x.post('/tasks', { title: 'Grande', dueDate: TODAY, estimateMinutes: 180 });
    const { summary } = (await x.get(`/day?date=${TODAY}`)).body;
    expect(summary.plannedMinutes).toBeGreaterThan(summary.capacityMinutes);
  });

  it('foco: até 3 tarefas, substitui a seleção, rejeita excesso e tarefa inexistente', async () => {
    const u = await registerUser();
    const x = as(u);
    const t = await Promise.all(
      [1, 2, 3, 4].map(
        async (n) => (await x.post('/tasks', { title: `t${n}`, dueDate: TODAY })).body.id as string,
      ),
    );
    const res = (await x.put(`/day/${TODAY}/focus`, { taskIds: [t[0], t[1]] }).expect(200)).body;
    expect(res.focusTaskIds).toEqual([t[0], t[1]]);
    expect(res.items.filter((i: { isFocus: boolean }) => i.isFocus)).toHaveLength(2);

    expect((await x.put(`/day/${TODAY}/focus`, { taskIds: [t[2]] })).body.focusTaskIds).toEqual([
      t[2],
    ]);
    const tooMany = await x.put(`/day/${TODAY}/focus`, { taskIds: t });
    expect(tooMany.status).toBe(400);
    expect(tooMany.body.error.message).toBe('Escolha até 3 prioridades');
    await x
      .put(`/day/${TODAY}/focus`, { taskIds: ['00000000-0000-0000-0000-000000000000'] })
      .expect(400);
    await x.put(`/day/${TODAY}/focus`, { taskIds: [] }).expect(200);
  });

  it('reflexão diária: salva, atualiza, aparece no dia e no histórico; dia futuro é recusado', async () => {
    const u = await registerUser();
    const x = as(u);
    const body = {
      accomplished: 'Terminei o relatório',
      pending: 'Revisar',
      learned: 'Pedir ajuda cedo',
      improve: 'Dormir mais',
      mood: 'good',
    };
    const saved = (await x.put(`/day/${TODAY}/reflection`, body).expect(200)).body;
    expect(saved).toMatchObject({ ...body, date: TODAY });
    await x.put(`/day/${TODAY}/reflection`, { ...body, mood: 'great' }).expect(200);
    expect((await x.get(`/day?date=${TODAY}`)).body.reflection.mood).toBe('great');
    expect((await x.get('/reflections')).body).toHaveLength(1);
    await x.put('/day/2026-12-25/reflection', body).expect(400);
    await x.put(`/day/${TODAY}/reflection`, { ...body, mood: 'eufórico' }).expect(400);
  });

  it('reagendar pendências move as abertas para outra data, mantendo a hora do bloco', async () => {
    const u = await registerUser();
    const x = as(u);
    const a = (
      await x.post('/tasks', { title: 'a', dueDate: TODAY, scheduledStart: at(TODAY, '15:00') })
    ).body;
    const b = (await x.post('/tasks', { title: 'b', dueDate: '2026-11-10' })).body;
    const done = (await x.post('/tasks', { title: 'c', dueDate: TODAY })).body;
    await x.patch(`/tasks/${done.id}`, { status: 'done' });

    const res = (await x.post(`/day/${TODAY}/reschedule`, { toDate: '2026-11-19' }).expect(200))
      .body;
    expect(res.moved).toBe(2);
    expect((await x.get(`/tasks/${a.id}`)).body).toMatchObject({
      dueDate: '2026-11-19',
      scheduledStart: at('2026-11-19', '15:00'),
    });
    expect((await x.get(`/tasks/${b.id}`)).body.dueDate).toBe('2026-11-19');
    expect((await x.get(`/tasks/${done.id}`)).body.dueDate).toBe(TODAY);
    await x.post(`/day/${TODAY}/reschedule`, { toDate: '2026-11-17' }).expect(400);
  });
});

describe('hábitos', () => {
  let api: ReturnType<typeof as>;

  beforeAll(async () => {
    freezeClock();
    api = as(await registerUser());
  });

  it('check-ins: feito, dia excepcional, correção e remoção; devolve estatísticas atualizadas', async () => {
    const habit = (
      await api.post('/habits', { name: 'Ler', weekdays: [0, 1, 2, 3, 4, 5, 6] }).expect(201)
    ).body;
    expect(habit).toMatchObject({
      status: 'active',
      targetType: 'check',
      stats: { currentStreak: 0, bestStreak: 0, rate30d: 0 },
    });

    const done = (
      await api.put(`/habits/${habit.id}/checkins/${TODAY}`, { status: 'done' }).expect(200)
    ).body;
    expect(done.stats.currentStreak).toBe(1);

    await api
      .put(`/habits/${habit.id}/checkins/2026-11-17`, { status: 'skipped', note: 'viagem' })
      .expect(200);
    const after = (await api.put(`/habits/${habit.id}/checkins/2026-11-16`, { status: 'done' }))
      .body;
    expect(after.stats.currentStreak).toBe(2); // 16 feito, 17 excepcional (neutro), 18 feito

    const checkins = (await api.get(`/habits/checkins?habitId=${habit.id}`)).body;
    expect(checkins).toHaveLength(3);
    expect(checkins.find((c: { date: string }) => c.date === '2026-11-17')).toMatchObject({
      status: 'skipped',
      note: 'viagem',
    });

    await api.put(`/habits/${habit.id}/checkins/${TODAY}`, { status: 'skipped' }).expect(200); // corrige
    await api.delete(`/habits/${habit.id}/checkins/2026-11-16`).expect(204);
    expect(((await api.get(`/habits/checkins?habitId=${habit.id}`)).body as unknown[]).length).toBe(
      2,
    );
  });

  it('não registra dia futuro; valida dias da semana e horário', async () => {
    const habit = (
      await api.post('/habits', { name: 'Corrida', weekdays: [1, 3, 5], suggestedTime: '06:30' })
    ).body;
    await api.put(`/habits/${habit.id}/checkins/2026-11-19`, { status: 'done' }).expect(400);
    await api.post('/habits', { name: 'x', weekdays: [] }).expect(400);
    await api.post('/habits', { name: 'x', weekdays: [7] }).expect(400);
    await api.post('/habits', { name: 'x', weekdays: [1], suggestedTime: '25:99' }).expect(400);
  });

  it('pausar e arquivar preservam o histórico; arquivados saem da lista padrão', async () => {
    const habit = (await api.post('/habits', { name: 'Meditar', weekdays: [1, 2, 3] })).body;
    await api.put(`/habits/${habit.id}/checkins/2026-11-17`, { status: 'done' });
    expect((await api.patch(`/habits/${habit.id}`, { status: 'paused' })).body.status).toBe(
      'paused',
    );
    expect(
      ((await api.get('/habits')).body as Array<{ id: string }>).some((h) => h.id === habit.id),
    ).toBe(true);
    await api.patch(`/habits/${habit.id}`, { status: 'archived' });
    expect(
      ((await api.get('/habits')).body as Array<{ id: string }>).some((h) => h.id === habit.id),
    ).toBe(false);
    expect(
      ((await api.get('/habits?status=archived')).body as Array<{ id: string }>).some(
        (h) => h.id === habit.id,
      ),
    ).toBe(true);
    expect(((await api.get(`/habits/checkins?habitId=${habit.id}`)).body as unknown[]).length).toBe(
      1,
    );
  });

  it('hábitos pausados não aparecem em Meu Dia', async () => {
    const habit = (await api.post('/habits', { name: 'Alongar', weekdays: [0, 1, 2, 3, 4, 5, 6] }))
      .body;
    const has = async () =>
      ((await api.get(`/day?date=${TODAY}`)).body.items as Array<{ title: string }>).some(
        (i) => i.title === 'Alongar',
      );
    expect(await has()).toBe(true);
    await api.patch(`/habits/${habit.id}`, { status: 'paused' });
    expect(await has()).toBe(false);
  });
});
