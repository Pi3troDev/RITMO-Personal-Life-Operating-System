import { beforeAll, describe, expect, it } from 'vitest';
import { as, freezeClock, registerUser, TODAY, type TestUser } from './helpers';

/**
 * "Usuário B não lê, altera nem apaga recurso do usuário A" — para cada módulo.
 * Recurso de outro usuário responde 404 (nunca 403), e vínculos cruzados são recusados.
 */
describe('isolamento entre usuários', () => {
  let a: TestUser;
  let b: TestUser;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    freezeClock();
    a = await registerUser('Alice');
    b = await registerUser('Bruno');
    const api = as(a);

    ids.area = (await api.get('/areas')).body[0].id;
    ids.task = (await api.post('/tasks', { title: 'tarefa da Alice' })).body.id;
    ids.project = (await api.post('/projects', { name: 'projeto da Alice' })).body.id;
    ids.goal = (
      await api.post('/goals', { name: 'objetivo da Alice', category: 'personal' })
    ).body.id;
    ids.habit = (
      await api.post('/habits', { name: 'hábito da Alice', weekdays: [1, 2, 3] })
    ).body.id;
    ids.event = (
      await api.post('/events', {
        title: 'evento da Alice',
        start: '2026-11-18T15:00:00.000Z',
        end: '2026-11-18T16:00:00.000Z',
      })
    ).body.id;
    ids.account = (
      await api.post('/finance/accounts', { name: 'Conta da Alice', kind: 'checking' })
    ).body.id;
    ids.reserve = (
      await api.post('/finance/accounts', { name: 'Reserva da Alice', kind: 'reserve' })
    ).body.id;
    ids.category = (await api.get('/finance/categories')).body[0].id;
    ids.transaction = (
      await api.post('/finance/transactions', {
        type: 'income',
        description: 'salário',
        amountCents: 100000,
        date: TODAY,
        accountId: ids.account,
      })
    ).body.id;
    ids.board = (await api.get('/boards/default')).body.id;
    ids.column = (await api.get('/boards/default')).body.columns[0].id;
    ids.timeEntry = (await api.post('/time-entries', { minutes: 30, kind: 'other' })).body.id;
    ids.vision = (
      await api.post('/vision', { year: 2027, title: 'visão da Alice', category: 'personal' })
    ).body.id;
    ids.inbox = (await api.post('/capture', { kind: 'idea', text: 'ideia da Alice' })).body.item.id;
    ids.track = (await api.post('/study/tracks', { name: 'trilha da Alice' })).body.id;
    ids.lesson = (await api.post(`/study/tracks/${ids.track}/lessons`, { title: 'aula' })).body.id;
    ids.studyModule = (
      await api.post(`/study/tracks/${ids.track}/modules`, { name: 'mod' })
    ).body.id;
    ids.resource = (
      await api.post(`/study/tracks/${ids.track}/resources`, { title: 'link' })
    ).body.id;
    ids.devProject = (await api.post('/dev/projects', { name: 'dev da Alice' })).body.id;
    ids.roadmap = (
      await api.post(`/dev/projects/${ids.devProject}/roadmap`, { title: 'nó' })
    ).body.id;
    ids.challenge = (await api.post('/dev/challenges', { title: 'desafio' })).body.id;
    ids.note = (await api.post('/notes', { title: 'nota da Alice' })).body.id;
    ids.vocab = (
      await api.post('/english/vocabulary', { term: 'secret', meaning: 'segredo' })
    ).body.id;
    ids.book = (
      await api.post('/reading/books', { title: 'livro da Alice', totalPages: 100 })
    ).body.id;
    ids.readingLog = (await api.post(`/reading/books/${ids.book}/logs`, { pagesRead: 5 })).body.id;
    ids.quote = (await api.post(`/reading/books/${ids.book}/quotes`, { text: 'citação' })).body.id;
    ids.plan = (await api.post('/health/plans', { name: 'treino da Alice' })).body.id;
    ids.workout = (await api.post('/health/workouts', { durationMinutes: 30 })).body.id;
    ids.prayer = (
      await api.post('/spiritual/prayer-requests', { title: 'pedido da Alice' })
    ).body.id;
    ids.prayerLog = (await api.post('/spiritual/prayer-logs', { minutes: 5 })).body.id;
    ids.bible = (
      await api.post('/spiritual/bible-readings', { book: 'João', chapterFrom: 1 })
    ).body.id;
    ids.notification = '00000000-0000-0000-0000-000000000000';
  });

  it('listas do Bruno nunca contêm dados da Alice', async () => {
    const api = as(b);
    expect((await api.get('/tasks')).body).toEqual([]);
    expect((await api.get('/projects')).body).toEqual([]);
    expect((await api.get('/goals')).body).toEqual([]);
    expect((await api.get('/habits')).body).toEqual([]);
    expect((await api.get('/finance/accounts')).body).toEqual([]);
    expect((await api.get('/finance/transactions')).body).toEqual([]);
    expect((await api.get('/time-entries')).body).toEqual([]);
    expect((await api.get('/vision')).body).toEqual([]);
    expect((await api.get('/inbox')).body).toEqual([]);
    for (const path of [
      '/study/tracks',
      '/dev/projects',
      '/dev/challenges',
      '/notes',
      '/english/vocabulary',
      '/reading/books',
      '/health/plans',
      '/health/workouts',
      '/spiritual/prayer-requests',
      '/spiritual/prayer-logs',
      '/spiritual/bible-readings',
    ]) {
      expect((await api.get(path)).body, path).toEqual([]);
    }
    expect((await api.get(`/agenda?from=${TODAY}&to=${TODAY}`)).body).toEqual([]);
    const areas = (await api.get('/areas')).body.map((x: { id: string }) => x.id);
    expect(areas).not.toContain(ids.area);
  });

  const forbidden: Array<[string, string, string, object?]> = [
    ['GET', '/tasks/:task', 'task'],
    ['PATCH', '/tasks/:task', 'task', { title: 'invadida' }],
    ['DELETE', '/tasks/:task', 'task'],
    ['GET', '/projects/:project', 'project'],
    ['PATCH', '/projects/:project', 'project', { name: 'invadido' }],
    ['DELETE', '/projects/:project', 'project'],
    ['GET', '/goals/:goal', 'goal'],
    ['PATCH', '/goals/:goal', 'goal', { name: 'invadido' }],
    ['POST', '/goals/:goal/milestones', 'goal', { title: 'marco' }],
    ['PUT', '/goals/:goal/metric', 'goal', { current: 1 }],
    ['DELETE', '/goals/:goal', 'goal'],
    ['GET', '/habits/:habit', 'habit'],
    ['PATCH', '/habits/:habit', 'habit', { name: 'invadido' }],
    ['PUT', `/habits/:habit/checkins/${TODAY}`, 'habit', { status: 'done' }],
    ['DELETE', `/habits/:habit/checkins/${TODAY}`, 'habit'],
    ['DELETE', '/habits/:habit', 'habit'],
    ['GET', '/events/:event', 'event'],
    ['PATCH', '/events/:event', 'event', { title: 'invadido' }],
    ['DELETE', '/events/:event', 'event'],
    ['PATCH', '/areas/:area', 'area', { name: 'invadida' }],
    ['DELETE', '/areas/:area', 'area'],
    ['PATCH', '/finance/accounts/:account', 'account', { name: 'invadida' }],
    ['DELETE', '/finance/accounts/:account', 'account'],
    ['PATCH', '/finance/transactions/:transaction', 'transaction', { description: 'invadida' }],
    ['DELETE', '/finance/transactions/:transaction', 'transaction'],
    ['PATCH', '/finance/categories/:category', 'category', { name: 'invadida' }],
    ['DELETE', '/finance/categories/:category', 'category'],
    ['PATCH', '/boards/:board', 'board', { name: 'invadido' }],
    ['DELETE', '/boards/:board', 'board'],
    ['POST', '/boards/:board/columns', 'board', { name: 'x', statusCategory: 'todo' }],
    ['PATCH', '/time-entries/:timeEntry', 'timeEntry', { title: 'invadido' }],
    ['DELETE', '/time-entries/:timeEntry', 'timeEntry'],
    ['PATCH', '/vision/:vision', 'vision', { title: 'invadido' }],
    ['DELETE', '/vision/:vision', 'vision'],
    ['POST', '/inbox/:inbox/discard', 'inbox'],
    ['POST', '/inbox/:inbox/convert', 'inbox', { to: 'task' }],
    ['GET', '/study/tracks/:track', 'track'],
    ['PATCH', '/study/tracks/:track', 'track', { name: 'invadida' }],
    ['DELETE', '/study/tracks/:track', 'track'],
    ['POST', '/study/tracks/:track/lessons', 'track', { title: 'x' }],
    ['POST', '/study/tracks/:track/modules', 'track', { name: 'x' }],
    ['POST', '/study/tracks/:track/resources', 'track', { title: 'x' }],
    ['PATCH', '/study/lessons/:lesson', 'lesson', { status: 'done' }],
    ['DELETE', '/study/lessons/:lesson', 'lesson'],
    ['PATCH', '/study/modules/:studyModule', 'studyModule', { name: 'x' }],
    ['DELETE', '/study/modules/:studyModule', 'studyModule'],
    ['PATCH', '/study/resources/:resource', 'resource', { title: 'x' }],
    ['DELETE', '/study/resources/:resource', 'resource'],
    ['GET', '/dev/projects/:devProject', 'devProject'],
    ['PATCH', '/dev/projects/:devProject', 'devProject', { name: 'x' }],
    ['DELETE', '/dev/projects/:devProject', 'devProject'],
    ['POST', '/dev/projects/:devProject/roadmap', 'devProject', { title: 'x' }],
    ['PATCH', '/dev/roadmap/:roadmap', 'roadmap', { status: 'done' }],
    ['DELETE', '/dev/roadmap/:roadmap', 'roadmap'],
    ['GET', '/dev/challenges/:challenge', 'challenge'],
    ['PATCH', '/dev/challenges/:challenge', 'challenge', { status: 'solved' }],
    ['DELETE', '/dev/challenges/:challenge', 'challenge'],
    ['GET', '/notes/:note', 'note'],
    ['PATCH', '/notes/:note', 'note', { title: 'x' }],
    ['DELETE', '/notes/:note', 'note'],
    ['GET', '/english/vocabulary/:vocab', 'vocab'],
    ['PATCH', '/english/vocabulary/:vocab', 'vocab', { status: 'mastered' }],
    ['POST', '/english/vocabulary/:vocab/review', 'vocab'],
    ['DELETE', '/english/vocabulary/:vocab', 'vocab'],
    ['GET', '/reading/books/:book', 'book'],
    ['PATCH', '/reading/books/:book', 'book', { title: 'x' }],
    ['DELETE', '/reading/books/:book', 'book'],
    ['GET', '/reading/books/:book/logs', 'book'],
    ['POST', '/reading/books/:book/logs', 'book', { pagesRead: 1 }],
    ['GET', '/reading/books/:book/quotes', 'book'],
    ['POST', '/reading/books/:book/quotes', 'book', { text: 'x' }],
    ['DELETE', '/reading/logs/:readingLog', 'readingLog'],
    ['PATCH', '/reading/quotes/:quote', 'quote', { note: 'x' }],
    ['DELETE', '/reading/quotes/:quote', 'quote'],
    ['PATCH', '/health/plans/:plan', 'plan', { name: 'x' }],
    ['DELETE', '/health/plans/:plan', 'plan'],
    ['PATCH', '/health/workouts/:workout', 'workout', { title: 'x' }],
    ['DELETE', '/health/workouts/:workout', 'workout'],
    ['PATCH', '/spiritual/prayer-requests/:prayer', 'prayer', { title: 'x' }],
    ['DELETE', '/spiritual/prayer-requests/:prayer', 'prayer'],
    ['DELETE', '/spiritual/prayer-logs/:prayerLog', 'prayerLog'],
    ['DELETE', '/spiritual/bible-readings/:bible', 'bible'],
    ['POST', '/notifications/:notification/read', 'notification'],
    ['DELETE', '/notifications/:notification', 'notification'],
  ];

  it.each(forbidden)('%s %s → 404 para outro usuário', async (method, template, key, body) => {
    const path = template.replace(/:(\w+)/, (_m, name: string) => ids[name]!);
    const api = as(b);
    const send = {
      GET: api.get,
      POST: api.post,
      PUT: api.put,
      PATCH: api.patch,
      DELETE: api.delete,
    }[method]!;
    const res = await send(path, body);
    expect(res.status, `${method} ${path}`).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(key).toBeTruthy();
  });

  it('nada da Alice foi alterado pelas tentativas do Bruno', async () => {
    const api = as(a);
    expect((await api.get(`/tasks/${ids.task}`)).body.title).toBe('tarefa da Alice');
    expect((await api.get(`/goals/${ids.goal}`)).body.name).toBe('objetivo da Alice');
    expect((await api.get(`/habits/${ids.habit}`)).body.name).toBe('hábito da Alice');
    expect((await api.get('/finance/transactions')).body).toHaveLength(1);
  });

  it('o Bruno não consegue vincular itens seus a recursos da Alice (400)', async () => {
    const api = as(b);
    expect((await api.post('/tasks', { title: 'x', goalId: ids.goal })).status).toBe(400);
    expect((await api.post('/tasks', { title: 'x', projectId: ids.project })).status).toBe(400);
    expect((await api.post('/tasks', { title: 'x', areaId: ids.area })).status).toBe(400);
    expect((await api.post('/tasks', { title: 'x', columnId: ids.column })).status).toBe(400);
    expect((await api.post('/projects', { name: 'x', areaId: ids.area })).status).toBe(400);
    expect((await api.post('/habits', { name: 'x', weekdays: [1], goalId: ids.goal })).status).toBe(
      400,
    );
    expect(
      (
        await api.post('/events', {
          title: 'x',
          start: '2026-11-18T15:00:00.000Z',
          end: '2026-11-18T16:00:00.000Z',
          areaId: ids.area,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api.post('/finance/transactions', {
          type: 'income',
          description: 'x',
          amountCents: 100,
          date: TODAY,
          accountId: ids.account,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api.post('/finance/transactions', {
          type: 'transfer',
          description: 'x',
          amountCents: 100,
          date: TODAY,
          accountId: ids.account,
          toAccountId: ids.reserve,
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await api.post('/goals', {
          name: 'x',
          category: 'financial',
          linkedAccountId: ids.reserve,
          metric: { kind: 'money', target: 1000, unit: 'R$' },
        })
      ).status,
    ).toBe(400);
    expect((await api.post('/time-entries', { minutes: 10, taskId: ids.task })).status).toBe(400);
    expect((await api.post('/time-entries/start', { goalId: ids.goal })).status).toBe(400);
    expect((await api.post('/time-entries', { minutes: 10, studyTrackId: ids.track })).status).toBe(
      400,
    );
    expect((await api.post('/time-entries', { minutes: 10, lessonId: ids.lesson })).status).toBe(
      400,
    );
    expect((await api.post('/time-entries', { minutes: 10, bookId: ids.book })).status).toBe(400);
    expect((await api.post('/study/tracks', { name: 'x', goalId: ids.goal })).status).toBe(400);
    expect((await api.post('/dev/projects', { name: 'x', areaId: ids.area })).status).toBe(400);
    expect((await api.post('/reading/books', { title: 'x', goalId: ids.goal })).status).toBe(400);
    expect((await api.post('/health/workouts', { planId: ids.plan })).status).toBe(400);
    expect((await api.post('/spiritual/prayer-logs', { requestId: ids.prayer })).status).toBe(400);
    expect((await api.put(`/day/${TODAY}/focus`, { taskIds: [ids.task] })).status).toBe(400);
    expect(
      (
        await api.put('/finance/budgets', {
          categoryId: ids.category,
          month: TODAY.slice(0, 7),
          limitCents: 1000,
        })
      ).status,
    ).toBe(400);
  });

  it('o foco do dia, a reflexão e as exportações são isolados', async () => {
    await as(a)
      .put(`/day/${TODAY}/reflection`, {
        accomplished: 'segredo',
        pending: '',
        learned: '',
        improve: '',
        mood: 'good',
      })
      .expect(200);
    const day = await as(b).get(`/day?date=${TODAY}`).expect(200);
    expect(day.body.reflection).toBeNull();
    expect((await as(b).get('/reflections')).body).toEqual([]);

    const exported = await as(b).get('/export').expect(200);
    expect(JSON.stringify(exported.body)).not.toContain('tarefa da Alice');
    expect(JSON.stringify(exported.body)).not.toContain('segredo');
  });
});
