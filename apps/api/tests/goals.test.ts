import { beforeAll, describe, expect, it } from 'vitest';
import { as, freezeClock, registerUser, TODAY, type TestUser } from './helpers';

describe('objetivos', () => {
  let user: TestUser;
  let api: ReturnType<typeof as>;

  beforeAll(async () => {
    freezeClock();
    user = await registerUser();
    api = as(user);
  });

  it('objetivo manual: progresso é o informado, limitado a 0–100', async () => {
    const goal = (
      await api.post('/goals', { name: 'Ler mais', category: 'intellectual' }).expect(201)
    ).body;
    expect(goal).toMatchObject({
      status: 'active',
      progressMode: 'manual',
      progress: 0,
      startDate: TODAY,
      milestones: [],
      habitIds: [],
    });
    expect((await api.patch(`/goals/${goal.id}`, { progress: 40 })).body.progress).toBe(40);
    await api.patch(`/goals/${goal.id}`, { progress: 140 }).expect(400);
  });

  it('por marcos: progresso = marcos concluídos ÷ total, e recalcula ao concluir/remover', async () => {
    const goal = (
      await api.post('/goals', {
        name: 'Certificação',
        category: 'academic',
        progressMode: 'milestones',
        milestones: [
          { title: 'Módulo 1' },
          { title: 'Módulo 2' },
          { title: 'Prova' },
          { title: 'Certificado' },
        ],
      })
    ).body;
    expect(goal.progress).toBe(0);
    const [m1, m2] = goal.milestones;
    const g1 = (
      await api.patch(`/goals/${goal.id}/milestones/${m1.id}`, { done: true }).expect(200)
    ).body;
    expect(g1.progress).toBe(25);
    expect(g1.milestones[0]).toMatchObject({ done: true, completedAt: expect.any(String) });
    expect(
      (await api.patch(`/goals/${goal.id}/milestones/${m2.id}`, { done: true })).body.progress,
    ).toBe(50);
    expect(
      (await api.patch(`/goals/${goal.id}/milestones/${m1.id}`, { done: false })).body.progress,
    ).toBe(25);
    const added = (await api.post(`/goals/${goal.id}/milestones`, { title: 'Extra' })).body;
    expect(added.milestones).toHaveLength(5);
    expect(added.progress).toBe(20);
    expect(
      (await api.delete(`/goals/${goal.id}/milestones/${added.milestones[4].id}`).expect(200)).body
        .milestones,
    ).toHaveLength(4);
  });

  it('meta financeira: o progresso acompanha o saldo da reserva (R$ 10.000)', async () => {
    const u = await registerUser();
    const x = as(u);
    const checking = (
      await x.post('/finance/accounts', {
        name: 'Conta',
        kind: 'checking',
        initialBalanceCents: 500_000,
      })
    ).body;
    const reserve = (
      await x.post('/finance/accounts', { name: 'Reserva de emergência', kind: 'reserve' })
    ).body;
    expect(reserve.isReserved).toBe(true);

    const goal = (
      await x
        .post('/goals', {
          name: 'Juntar R$ 10.000',
          category: 'financial',
          targetDate: '2027-06-30',
          linkedAccountId: reserve.id,
          metric: { kind: 'money', target: 1_000_000, unit: 'R$' },
        })
        .expect(201)
    ).body;
    expect(goal).toMatchObject({
      progressMode: 'metric',
      progress: 0,
      linkedAccountId: reserve.id,
      metric: { kind: 'money', current: 0, target: 1_000_000 },
    });

    await x
      .post('/finance/transactions', {
        type: 'transfer',
        description: 'Aporte',
        amountCents: 250_000,
        date: TODAY,
        accountId: checking.id,
        toAccountId: reserve.id,
      })
      .expect(201);
    const after = (await x.get(`/goals/${goal.id}`)).body;
    expect(after.metric.current).toBe(250_000);
    expect(after.progress).toBe(25);
    expect(after.lastActivityAt).not.toBeNull();

    // saque da reserva reduz o progresso
    await x.post('/finance/transactions', {
      type: 'transfer',
      description: 'Resgate',
      amountCents: 50_000,
      date: TODAY,
      accountId: reserve.id,
      toAccountId: checking.id,
    });
    expect((await x.get(`/goals/${goal.id}`)).body.progress).toBe(20);

    // a mesma reserva não pode alimentar dois objetivos
    const dup = await x.post('/goals', {
      name: 'Outro',
      category: 'financial',
      linkedAccountId: reserve.id,
      metric: { kind: 'money', target: 5000, unit: 'R$' },
    });
    expect(dup.status).toBe(409);
    // e conta comum não é reserva
    const notReserve = await x.post('/goals', {
      name: 'Outro',
      category: 'financial',
      linkedAccountId: checking.id,
      metric: { kind: 'money', target: 5000, unit: 'R$' },
    });
    expect(notReserve.status).toBe(400);
  });

  it('métrica de horas soma o tempo registrado; contagem soma check-ins dos hábitos ligados', async () => {
    const u = await registerUser();
    const x = as(u);
    const hours = (
      await x.post('/goals', {
        name: '100h de inglês',
        category: 'academic',
        metric: { kind: 'hours', target: 100, unit: 'h' },
      })
    ).body;
    await x.post('/time-entries', { minutes: 90, goalId: hours.id }).expect(201);
    await x.post('/time-entries', { minutes: 30, goalId: hours.id }).expect(201);
    const h = (await x.get(`/goals/${hours.id}`)).body;
    expect(h.metric.current).toBe(2);
    expect(h.progress).toBe(2);

    const habit = (await x.post('/habits', { name: 'Treinar', weekdays: [0, 1, 2, 3, 4, 5, 6] }))
      .body;
    const count = (
      await x.post('/goals', {
        name: '20 treinos',
        category: 'health',
        metric: { kind: 'count', target: 20, unit: 'treinos' },
        habitIds: [habit.id],
      })
    ).body;
    expect(count.habitIds).toEqual([habit.id]);
    await x.put(`/habits/${habit.id}/checkins/${TODAY}`, { status: 'done' });
    await x.put(`/habits/${habit.id}/checkins/2026-11-17`, { status: 'done' });
    await x.put(`/habits/${habit.id}/checkins/2026-11-16`, { status: 'skipped' });
    const c = (await x.get(`/goals/${count.id}`)).body;
    expect(c.metric.current).toBe(2);
    expect(c.progress).toBe(10);

    // valor informado à mão soma-se ao medido
    const manual = (await x.put(`/goals/${count.id}/metric`, { current: 3 }).expect(200)).body;
    expect(manual.metric.current).toBe(5);
    expect((await x.get(`/habits/${habit.id}`)).body.goalId).toBe(count.id);
  });

  it('tarefas ligadas contam como abertas/concluídas no objetivo', async () => {
    const u = await registerUser();
    const x = as(u);
    const goal = (await x.post('/goals', { name: 'Lançar produto', category: 'professional' }))
      .body;
    const t1 = (await x.post('/tasks', { title: 't1', goalId: goal.id })).body;
    await x.post('/tasks', { title: 't2', goalId: goal.id });
    await x.patch(`/tasks/${t1.id}`, { status: 'done' });
    expect((await x.get(`/goals/${goal.id}`)).body).toMatchObject({
      openTaskCount: 1,
      doneTaskCount: 1,
    });
  });

  it('histórico guarda no máximo um ponto por dia e mostra a evolução', async () => {
    const u = await registerUser();
    const x = as(u);
    const goal = (await x.post('/goals', { name: 'Evolução', category: 'personal' })).body;
    await x.get('/goals');
    await x.patch(`/goals/${goal.id}`, { progress: 30 });
    await x.get('/goals');
    const g = (await x.get(`/goals/${goal.id}`)).body;
    expect(g.history).toEqual([{ date: TODAY, progress: 30 }]);
  });

  it('concluir define o status e a data; objetivo arquivado some da lista padrão', async () => {
    const u = await registerUser();
    const x = as(u);
    const goal = (await x.post('/goals', { name: 'Fechar', category: 'personal' })).body;
    expect((await x.patch(`/goals/${goal.id}`, { status: 'completed' })).body.status).toBe(
      'completed',
    );
    await x.patch(`/goals/${goal.id}`, { status: 'archived' });
    expect((await x.get('/goals')).body).toHaveLength(0);
    expect((await x.get('/goals?status=archived')).body).toHaveLength(1);
  });

  it('Visão do ano: CRUD e filtro por ano', async () => {
    const u = await registerUser();
    const x = as(u);
    const goal = (await x.post('/goals', { name: 'Meta', category: 'financial' })).body;
    const item = (
      await x
        .post('/vision', {
          year: 2027,
          title: 'Reserva de R$ 10.000',
          category: 'financial',
          goalId: goal.id,
        })
        .expect(201)
    ).body;
    await x.post('/vision', { year: 2028, title: 'Outro ano', category: 'personal' });
    expect((await x.get('/vision?year=2027')).body).toHaveLength(1);
    expect((await x.patch(`/vision/${item.id}`, { achieved: true })).body.achieved).toBe(true);
    await x.delete(`/vision/${item.id}`).expect(204);
    expect((await x.get('/vision')).body).toHaveLength(1);
    await x.post('/vision', { year: 1999, title: 'x', category: 'personal' }).expect(400);
  });

  it('excluir objetivo mantém tarefas e hábitos, sem vínculo', async () => {
    const u = await registerUser();
    const x = as(u);
    const goal = (await x.post('/goals', { name: 'Temporário', category: 'personal' })).body;
    const task = (await x.post('/tasks', { title: 'ligada', goalId: goal.id })).body;
    await x.delete(`/goals/${goal.id}`).expect(204);
    expect((await x.get(`/tasks/${task.id}`)).body.goalId).toBeNull();
  });
});
