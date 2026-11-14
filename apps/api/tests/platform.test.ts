import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { generateReminders } from '../src/modules/notifications/reminders';
import {
  API,
  app,
  as,
  freezeClock,
  NOW,
  registerUser,
  testBundle,
  testDb,
  TODAY,
  type TestUser,
} from './helpers';

const at = (day: string, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number) as [number, number];
  return new Date(Date.parse(`${day}T00:00:00Z`) + (h + 3) * 3_600_000 + m * 60_000).toISOString();
};

describe('documentação OpenAPI / Swagger', () => {
  it('serve o documento OpenAPI 3.1 com todas as rotas e o esquema de segurança', async () => {
    const res = await request(app).get('/api/openapi.json').expect(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.components.securitySchemes.bearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    });

    const documented = new Set<string>();
    for (const [path, methods] of Object.entries(
      res.body.paths as Record<string, Record<string, unknown>>,
    )) {
      for (const method of Object.keys(methods)) documented.add(`${method.toUpperCase()} ${path}`);
    }
    for (const r of testBundle.routes) {
      const path = r.path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
      expect(
        documented.has(`${r.method.toUpperCase()} ${path}`),
        `${r.method} ${r.path} não está documentada`,
      ).toBe(true);
    }
    expect(documented.size).toBe(testBundle.routes.length);
  });

  it('toda operação tem resumo, tag e respostas; rotas autenticadas declaram segurança e 401', async () => {
    const { body } = await request(app).get('/api/openapi.json');
    for (const [path, methods] of Object.entries(
      body.paths as Record<
        string,
        Record<
          string,
          {
            summary?: string;
            tags?: string[];
            responses?: Record<string, unknown>;
            security?: unknown;
          }
        >
      >,
    )) {
      for (const [method, op] of Object.entries(methods)) {
        const label = `${method} ${path}`;
        expect(op.summary, label).toBeTruthy();
        expect(op.tags?.length, label).toBeGreaterThan(0);
        expect(Object.keys(op.responses ?? {}).length, label).toBeGreaterThan(0);
        if (!path.startsWith('/auth/') && path !== '/health') {
          expect(op.security, label).toBeTruthy();
          expect(op.responses?.['401'], label).toBeTruthy();
        }
      }
    }
  });

  it('esquemas de entrada e saída são gerados dos contratos Zod', async () => {
    const { body } = await request(app).get('/api/openapi.json');
    const register = body.paths['/auth/register'].post;
    expect(register.requestBody.content['application/json'].schema.required).toEqual(
      expect.arrayContaining(['name', 'email', 'password']),
    );
    expect(body.paths['/tasks'].get.parameters.map((p: { name: string }) => p.name)).toEqual(
      expect.arrayContaining(['view', 'projectId']),
    );
    expect(body.paths['/tasks/{id}'].get.parameters[0]).toMatchObject({
      name: 'id',
      in: 'path',
      required: true,
    });
    expect(body.paths['/tasks'].get.responses['200'].content['application/json'].schema.type).toBe(
      'array',
    );
  });

  it('a interface do Swagger está no ar em /api/docs', async () => {
    const res = await request(app).get('/api/docs/').expect(200);
    expect(res.text).toContain('swagger-ui');
    await request(app).get('/').expect(302).expect('Location', '/api/docs');
  });
});

describe('segurança de borda', () => {
  it('envia cabeçalhos de segurança e esconde X-Powered-By', async () => {
    const res = await request(app).get(`${API}/health`);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeTruthy();
  });

  it('CORS só libera as origens configuradas, com credenciais', async () => {
    const ok = await request(app).get(`${API}/health`).set('Origin', 'http://localhost:5173');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(ok.headers['access-control-allow-credentials']).toBe('true');
    const bad = await request(app).get(`${API}/health`).set('Origin', 'https://malicioso.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('limita o tamanho do corpo', async () => {
    const res = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'a@b.co', password: 'x'.repeat(200_000) });
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('o erro 500 não vaza detalhes internos', async () => {
    const u = await registerUser();
    // id com formato absurdo não derruba nada: vira 404 limpo
    const res = await as(u).get(`/tasks/${'x'.repeat(40)}`);
    expect(res.status).toBe(404);
    expect(JSON.stringify(res.body)).not.toMatch(/prisma|stack|select|mysql/i);
  });
});

describe('revisões, insights, relatórios, notificações e exportação', () => {
  let user: TestUser;
  let x: ReturnType<typeof as>;

  beforeAll(async () => {
    freezeClock();
    user = await registerUser();
    x = as(user);
  });

  it('revisão semanal chega preenchida com os números da semana (segunda a domingo)', async () => {
    const u = as(await registerUser());
    const [work] = (await u.get('/areas')).body as Array<{ id: string }>;
    const done = (await u.post('/tasks', { title: 'feita', dueDate: TODAY })).body;
    await u.patch(`/tasks/${done.id}`, { status: 'done' });
    await u.post('/tasks', { title: 'atrasada', dueDate: '2026-11-10' });
    await u.post('/time-entries', { minutes: 90, areaId: work!.id });
    await u.post('/events', {
      title: 'Passada',
      start: at('2026-11-17', '09:00'),
      end: at('2026-11-17', '10:00'),
    });
    await u.post('/events', {
      title: 'Futura',
      start: at('2026-11-20', '09:00'),
      end: at('2026-11-20', '10:00'),
    });
    const habit = (await u.post('/habits', { name: 'Ler', weekdays: [0, 1, 2, 3, 4, 5, 6] })).body;
    await u.put(`/habits/${habit.id}/checkins/2026-11-16`, { status: 'done' });
    await u.put(`/habits/${habit.id}/checkins/2026-11-17`, { status: 'skipped' });
    const a = (await u.post('/finance/accounts', { name: 'C', kind: 'checking' })).body.id;
    const r = (await u.post('/finance/accounts', { name: 'R', kind: 'reserve' })).body.id;
    await u.post('/finance/transactions', {
      type: 'income',
      description: 'i',
      amountCents: 100_000,
      date: TODAY,
      accountId: a,
    });
    await u.post('/finance/transactions', {
      type: 'expense',
      description: 'e',
      amountCents: 30_000,
      date: TODAY,
      accountId: a,
    });
    await u.post('/finance/transactions', {
      type: 'transfer',
      description: 'aporte',
      amountCents: 20_000,
      date: TODAY,
      accountId: a,
      toAccountId: r,
    });
    await u.put(`/day/${TODAY}/reflection`, {
      accomplished: '',
      pending: '',
      learned: '',
      improve: '',
      mood: 'good',
    });

    const o = (await u.get(`/reviews/weekly/current?date=${TODAY}`).expect(200)).body;
    expect(o).toMatchObject({
      type: 'weekly',
      periodStart: '2026-11-16',
      periodEnd: '2026-11-22',
      review: null,
    });
    expect(o.metrics).toMatchObject({
      tasksCompleted: 1,
      tasksOverdue: 1,
      eventsAttended: 1,
      trackedMinutes: 90,
      finance: { incomeCents: 100_000, expenseCents: 30_000, reservedCents: 20_000 },
      reflections: { count: 1, moods: { good: 1 } },
    });
    expect(o.metrics.trackedByArea).toEqual([{ areaId: work!.id, name: 'Trabalho', minutes: 90 }]);
    // hábito: 16 feito, 17 excepcional, 18 (hoje) sem registro e ainda pode ser feito → 1 esperado/1 feito
    expect(o.metrics.habits).toMatchObject({ expected: 1, done: 1, skipped: 1, rate: 1 });
  });

  it('salva rascunho, conclui congelando as métricas e valida o início do período', async () => {
    const u = as(await registerUser());
    const draft = (
      await u
        .put('/reviews/weekly/2026-11-16', {
          answers: { wentWell: 'Constância' },
          priorities: ['A', 'B'],
        })
        .expect(200)
    ).body;
    expect(draft.review).toMatchObject({
      status: 'draft',
      answers: { wentWell: 'Constância', learned: '' },
      priorities: ['A', 'B'],
      completedAt: null,
    });

    await u
      .post('/tasks', { title: 'x', dueDate: TODAY })
      .then(async (r) => u.patch(`/tasks/${r.body.id}`, { status: 'done' }));
    const done = (await u.put('/reviews/weekly/2026-11-16', { complete: true }).expect(200)).body;
    expect(done.review.status).toBe('completed');
    expect(done.metrics.tasksCompleted).toBe(1);

    // depois de concluída, os números ficam congelados mesmo que o mundo mude
    await u
      .post('/tasks', { title: 'y', dueDate: TODAY })
      .then(async (r) => u.patch(`/tasks/${r.body.id}`, { status: 'done' }));
    expect((await u.get(`/reviews/weekly/current?date=${TODAY}`)).body.metrics.tasksCompleted).toBe(
      1,
    );
    expect((await u.get('/reviews?type=weekly')).body).toHaveLength(1);

    expect((await u.put('/reviews/weekly/2026-11-18', {})).status).toBe(400); // não é segunda
    expect((await u.put('/reviews/weekly/2026-11-23', {})).status).toBe(400); // semana futura
    expect(
      (await u.put('/reviews/weekly/2026-11-16', { priorities: ['1', '2', '3', '4'] })).status,
    ).toBe(400);
    const monthly = (await u.get(`/reviews/monthly/current?date=${TODAY}`)).body;
    expect(monthly).toMatchObject({ periodStart: '2026-11-01', periodEnd: '2026-11-30' });
  });

  it('insights: objetivo parado, atrasadas e queda de hábito, cada um com evidência; sem dados, nada', async () => {
    const empty = as(await registerUser());
    expect((await empty.get('/insights')).body).toEqual([]);

    const u = as(await registerUser());
    // objetivo criado há 30 dias, sem nenhuma atividade
    const goal = (
      await u.post('/goals', { name: 'Parado', category: 'personal', startDate: '2026-10-10' })
    ).body;
    for (let i = 0; i < 5; i++)
      await u.post('/tasks', { title: `atrasada ${i}`, dueDate: '2026-11-01' });
    // hábito: ótimo nas duas semanas anteriores, péssimo nas recentes
    const habit = (await u.post('/habits', { name: 'Treino', weekdays: [0, 1, 2, 3, 4, 5, 6] }))
      .body;
    await testDb.habit.update({
      where: { id: habit.id },
      data: { createdAt: new Date('2026-10-01T12:00:00Z') },
    });
    for (let d = 4; d <= 17; d++)
      await u
        .put(`/habits/${habit.id}/checkins/2026-11-${String(d).padStart(2, '0')}`, {
          status: d <= 10 ? 'done' : 'skipped',
        })
        .catch(() => undefined);
    await testDb.habitCheckin.deleteMany({ where: { habitId: habit.id } });
    const rows = [];
    for (let back = 15; back <= 28; back++)
      rows.push({
        habitId: habit.id,
        userId: (await testDb.habit.findUniqueOrThrow({ where: { id: habit.id } })).userId,
        date: new Date(
          `${new Date(Date.parse(`${TODAY}T00:00:00Z`) - back * 86_400_000).toISOString().slice(0, 10)}T00:00:00Z`,
        ),
        status: 'done' as const,
      });
    await testDb.habitCheckin.createMany({ data: rows });

    const insights = (await u.get('/insights')).body as Array<{
      id: string;
      kind: string;
      tone: string;
      evidence: Record<string, unknown>;
      title: string;
    }>;
    const kinds = insights.map((i) => i.kind);
    expect(kinds).toEqual(expect.arrayContaining(['goal_stalled', 'overdue_pile', 'habit_drop']));
    expect(insights.find((i) => i.kind === 'goal_stalled')!.evidence).toMatchObject({
      goalId: goal.id,
      daysWithoutActivity: 39,
    });
    expect(insights.find((i) => i.kind === 'overdue_pile')!.evidence).toMatchObject({
      count: 5,
      oldestDueDate: '2026-11-01',
    });
    expect(insights.find((i) => i.kind === 'habit_drop')!.evidence).toMatchObject({
      previousRate: 100,
      recentRate: 0,
    });
    expect(insights.every((i) => i.tone === 'attention' || i.tone === 'positive')).toBe(true);
  });

  it('insight de dia acima da capacidade e de sequência', async () => {
    const u = as(await registerUser());
    await u.patch('/me', { dailyCapacityMinutes: 60 });
    await u.post('/tasks', { title: 'enorme', dueDate: TODAY, estimateMinutes: 240 });
    const habit = (await u.post('/habits', { name: 'Diário', weekdays: [0, 1, 2, 3, 4, 5, 6] }))
      .body;
    for (let back = 0; back < 8; back++) {
      const day = new Date(Date.parse(`${TODAY}T00:00:00Z`) - back * 86_400_000)
        .toISOString()
        .slice(0, 10);
      await u.put(`/habits/${habit.id}/checkins/${day}`, { status: 'done' });
    }
    const insights = (await u.get('/insights')).body as Array<{
      kind: string;
      evidence: Record<string, unknown>;
    }>;
    expect(insights.find((i) => i.kind === 'day_overloaded')!.evidence).toMatchObject({
      date: TODAY,
      plannedMinutes: 240,
      capacityMinutes: 60,
    });
    expect(insights.find((i) => i.kind === 'habit_streak')!.evidence).toMatchObject({
      currentStreak: 8,
    });
  });

  it('relatório de evolução devolve uma linha por semana, da mais antiga para a atual', async () => {
    const u = as(await registerUser());
    const t = (await u.post('/tasks', { title: 'x', dueDate: TODAY })).body;
    await u.patch(`/tasks/${t.id}`, { status: 'done' });
    const { weeks } = (await u.get('/reports/evolution?weeks=3').expect(200)).body;
    expect(weeks.map((w: { start: string }) => w.start)).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
    ]);
    expect(weeks[2].tasksCompleted).toBe(1);
    expect(weeks[0].habitRate).toBeNull();
    await u.get('/reports/evolution?weeks=99').expect(400);
  });

  it('notificações: lembrete de compromisso é gerado uma única vez e pode ser lido/apagado', async () => {
    const u = await registerUser();
    const api = as(u);
    await api.post('/events', {
      title: 'Consulta',
      location: 'Clínica',
      start: at(TODAY, '12:30'),
      end: at(TODAY, '13:30'),
      reminderMinutes: 60,
    });
    await api.post('/tasks', { title: 'Pagar boleto', dueDate: TODAY });

    const first = await generateReminders(testDb, NOW); // 12:00 local; lembrete 60 min antes de 12:30
    expect(first).toBeGreaterThanOrEqual(2);
    await generateReminders(testDb, NOW); // idempotente
    const list = (await api.get('/notifications').expect(200)).body as Array<{
      id: string;
      type: string;
      title: string;
      body: string;
      read: boolean;
    }>;
    expect(list.filter((n) => n.type === 'event_reminder')).toHaveLength(1);
    expect(list.find((n) => n.type === 'event_reminder')).toMatchObject({
      title: 'Consulta',
      body: 'Começa às 12:30 · Clínica',
      read: false,
    });
    expect(list.find((n) => n.type === 'task_due')!.body).toBe('Pagar boleto');

    expect((await api.get('/notifications/unread-count')).body.count).toBe(list.length);
    const read = (await api.post(`/notifications/${list[0]!.id}/read`).expect(200)).body;
    expect(read.read).toBe(true);
    expect((await api.get('/notifications?unread=true')).body).toHaveLength(list.length - 1);
    await api.post('/notifications/read-all').expect(204);
    expect((await api.get('/notifications/unread-count')).body.count).toBe(0);
    await api.delete(`/notifications/${list[0]!.id}`).expect(204);

    // ocorrência cancelada não notifica; preferências desligadas também não
    const prefs = (
      await api
        .put('/notifications/preferences', { eventReminders: false, taskDue: false })
        .expect(200)
    ).body;
    expect(prefs).toMatchObject({ eventReminders: false, taskDue: false, habitReminders: true });
    const before = (await api.get('/notifications')).body.length;
    await api.post('/events', {
      title: 'Outra',
      start: at(TODAY, '12:30'),
      end: at(TODAY, '13:00'),
      reminderMinutes: 60,
    });
    await generateReminders(testDb, NOW);
    expect((await api.get('/notifications')).body.length).toBe(before);
  });

  it('lembretes de revisão (domingo à noite) e prazo de objetivo', async () => {
    const u = await registerUser();
    const api = as(u);
    await api.post('/goals', {
      name: 'Prazo curto',
      category: 'personal',
      targetDate: '2026-11-25',
    });
    const sunday = new Date('2026-11-22T22:00:00Z'); // 19:00 local de domingo
    await generateReminders(testDb, sunday);
    const types = ((await api.get('/notifications')).body as Array<{ type: string }>).map(
      (n) => n.type,
    );
    expect(types).toContain('weekly_review');
    // faltam 3 dias para a meta (25) — sem lembrete; mas 7 dias antes (18) teria. Conferimos o dia certo:
    await generateReminders(testDb, new Date('2026-11-18T15:00:00Z'));
    expect(
      ((await api.get('/notifications')).body as Array<{ type: string; title: string }>).find(
        (n) => n.type === 'goal_deadline',
      )?.title,
    ).toBe('Faltam 7 dia(s) para um objetivo');
  });

  it('inscrição de web push é guardada por usuário e pode ser removida', async () => {
    const endpoint = 'https://push.example/abc123';
    await x
      .post('/notifications/push-subscriptions', { endpoint, keys: { p256dh: 'k', auth: 'a' } })
      .expect(204);
    await x
      .post('/notifications/push-subscriptions', { endpoint, keys: { p256dh: 'k2', auth: 'a2' } })
      .expect(204);
    expect(await testDb.pushSubscription.count({ where: { userId: user.id } })).toBe(1);
    await x.delete('/notifications/push-subscriptions', { endpoint }).expect(204);
    expect(await testDb.pushSubscription.count({ where: { userId: user.id } })).toBe(0);
  });

  it('módulos e configurações: liga/desliga módulos, tema, fuso e áreas', async () => {
    const u = as(await registerUser());
    const modules = (await u.get('/settings/modules')).body as Array<{
      key: string;
      enabled: boolean;
    }>;
    expect(modules.every((m) => m.enabled)).toBe(true);
    const after = (
      await u.put('/settings/modules', { modules: [{ key: 'finance', enabled: false }] })
    ).body as Array<{ key: string; enabled: boolean }>;
    expect(after.find((m) => m.key === 'finance')!.enabled).toBe(false);
    expect(after.filter((m) => m.enabled)).toHaveLength(modules.length - 1);

    expect(
      (await u.patch('/settings', { theme: 'light', currency: 'USD' }).expect(200)).body,
    ).toMatchObject({ theme: 'light', currency: 'USD', timezone: 'America/Sao_Paulo' });
    expect((await u.patch('/settings', { timezone: 'Marte/Olympus' })).status).toBe(400);
    expect(
      (await u.patch('/me', { timezone: 'America/New_York', name: 'Novo Nome', weekStartsOn: 0 }))
        .body,
    ).toMatchObject({ timezone: 'America/New_York', name: 'Novo Nome', weekStartsOn: 0 });
    expect((await u.patch('/me', { weekStartsOn: 3 })).status).toBe(400);

    const area = (
      await u.post('/areas', { name: 'Família', color: 'pessoal', icon: 'heart' }).expect(201)
    ).body;
    expect(area).toMatchObject({ name: 'Família', archived: false });
    expect((await u.post('/areas', { name: 'Família', color: 'outros' })).status).toBe(409);
    expect((await u.patch(`/areas/${area.id}`, { archived: true })).body.archived).toBe(true);
    expect(
      ((await u.get('/areas')).body as Array<{ id: string }>).some((a) => a.id === area.id),
    ).toBe(false);
    const task = (await u.post('/tasks', { title: 't', areaId: area.id })).body;
    await u.delete(`/areas/${area.id}`).expect(204);
    expect((await u.get(`/tasks/${task.id}`)).body.areaId).toBeNull();
  });

  it('exportação devolve todos os dados do usuário e nunca a senha', async () => {
    const u = await registerUser('Exportável');
    const api = as(u);
    await api.post('/tasks', { title: 'exportar isto' });
    await api.post('/goals', { name: 'meta', category: 'personal' });
    const res = await api.get('/export').expect(200);
    expect(res.headers['content-disposition']).toMatch(
      /attachment; filename="ritmo-export-\d{4}-\d{2}-\d{2}\.json"/,
    );
    expect(res.body).toMatchObject({ app: 'ritmo', version: 1 });
    expect(res.body.data.tasks).toHaveLength(1);
    expect(res.body.data.areas).toHaveLength(9);
    expect(res.body.data.user.email).toBe(u.email);
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|argon2|tokenHash/);
  });
});
