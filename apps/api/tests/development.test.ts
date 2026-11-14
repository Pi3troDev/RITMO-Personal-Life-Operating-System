import { beforeAll, describe, expect, it } from 'vitest';
import { as, freezeClock, registerUser, TODAY } from './helpers';

describe('estudos', () => {
  let x: ReturnType<typeof as>;
  beforeAll(async () => {
    freezeClock();
    x = as(await registerUser());
  });

  it('trilha com módulos e aulas: progresso, status automático e tempo estudado', async () => {
    const goal = (await x.post('/goals', { name: 'Certificação', category: 'academic' })).body;
    const track = (
      await x
        .post('/study/tracks', {
          name: 'Node.js avançado',
          kind: 'course',
          provider: 'Alura',
          url: 'https://example.com/curso',
          weeklyTargetMinutes: 300,
          goalId: goal.id,
        })
        .expect(201)
    ).body;
    expect(track).toMatchObject({
      status: 'not_started',
      lessonsTotal: 0,
      progress: 0,
      minutesStudied: 0,
      weeklyTargetMinutes: 300,
    });

    const mod = (await x.post(`/study/tracks/${track.id}/modules`, { name: 'Streams' }).expect(201))
      .body;
    const l1 = (
      await x
        .post(`/study/tracks/${track.id}/lessons`, {
          title: 'Introdução',
          moduleId: mod.id,
          durationMinutes: 20,
        })
        .expect(201)
    ).body;
    const l2 = (await x.post(`/study/tracks/${track.id}/lessons`, { title: 'Backpressure' })).body;
    await x
      .post(`/study/tracks/${track.id}/resources`, {
        title: 'Docs oficiais',
        type: 'documentation',
        url: 'https://nodejs.org',
      })
      .expect(201);

    const done = (await x.patch(`/study/lessons/${l1.id}`, { status: 'done' }).expect(200)).body;
    expect(done).toMatchObject({ status: 'done', completedAt: expect.any(String) });

    // sessão de estudo = registro de tempo ligado à aula; copia trilha, área e objetivo
    const entry = (await x.post('/time-entries', { minutes: 40, lessonId: l2.id }).expect(201))
      .body;
    expect(entry).toMatchObject({
      kind: 'study',
      studyTrackId: track.id,
      goalId: goal.id,
      lessonId: l2.id,
    });
    expect(entry.areaId).not.toBeNull();

    const detail = (await x.get(`/study/tracks/${track.id}`).expect(200)).body;
    expect(detail).toMatchObject({
      status: 'in_progress',
      lessonsTotal: 2,
      lessonsDone: 1,
      progress: 50,
      minutesStudied: 40,
      minutesThisWeek: 40,
      startedAt: TODAY,
    });
    expect(detail.modules).toHaveLength(1);
    expect(detail.lessons.map((l: { title: string }) => l.title)).toEqual([
      'Introdução',
      'Backpressure',
    ]);
    expect(detail.resources).toHaveLength(1);

    const summary = (await x.get('/study/summary')).body;
    expect(summary).toMatchObject({ totalMinutesThisWeek: 40 });
    expect(summary.tracks[0]).toMatchObject({
      id: track.id,
      minutesThisWeek: 40,
      weeklyTargetMinutes: 300,
    });

    // módulo excluído não apaga as aulas
    await x.delete(`/study/modules/${mod.id}`).expect(204);
    expect(
      (
        (await x.get(`/study/tracks/${track.id}`)).body.lessons as Array<{
          moduleId: string | null;
        }>
      )[0]!.moduleId,
    ).toBeNull();

    expect(
      (await x.patch(`/study/tracks/${track.id}`, { status: 'completed' })).body,
    ).toMatchObject({
      status: 'completed',
      completedAt: expect.any(String),
    });
    await x
      .post(`/study/tracks/${track.id}/lessons`, {
        title: 'x',
        moduleId: '00000000-0000-0000-0000-000000000000',
      })
      .expect(400);
  });

  it('excluir a trilha apaga aulas e materiais, mas o tempo estudado fica no histórico', async () => {
    const u = as(await registerUser());
    const track = (await u.post('/study/tracks', { name: 'Temporária' })).body;
    await u.post(`/study/tracks/${track.id}/lessons`, { title: 'a' });
    await u.post('/time-entries', { minutes: 15, studyTrackId: track.id });
    await u.delete(`/study/tracks/${track.id}`).expect(204);
    const entries = (await u.get('/time-entries')).body as Array<{
      studyTrackId: string | null;
      durationSeconds: number;
    }>;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ studyTrackId: null, durationSeconds: 900 });
  });
});

describe('dev space', () => {
  it('projeto com roadmap aninhado, progresso, e desafios', async () => {
    freezeClock();
    const x = as(await registerUser());
    const project = (
      await x
        .post('/dev/projects', {
          name: 'RITMO',
          status: 'active',
          stack: ['React', 'Node'],
          repoUrl: 'https://github.com/x/y',
        })
        .expect(201)
    ).body;
    expect(project).toMatchObject({ stack: ['React', 'Node'], roadmapTotal: 0, progress: 0 });

    const root = (await x.post(`/dev/projects/${project.id}/roadmap`, { title: 'API' }).expect(201))
      .body;
    const child = (
      await x.post(`/dev/projects/${project.id}/roadmap`, {
        title: 'Autenticação',
        parentId: root.id,
      })
    ).body;
    await x.post(`/dev/projects/${project.id}/roadmap`, { title: 'Front' });
    expect(child.parentId).toBe(root.id);
    await x.patch(`/dev/roadmap/${child.id}`, { status: 'done' }).expect(200);
    await x.patch(`/dev/roadmap/${root.id}`, { parentId: root.id }).expect(400);

    const detail = (await x.get(`/dev/projects/${project.id}`)).body;
    expect(detail).toMatchObject({ roadmapTotal: 3, roadmapDone: 1, progress: 33 });
    expect(detail.roadmap).toHaveLength(3);

    await x.delete(`/dev/roadmap/${root.id}`).expect(204); // o filho sobe para a raiz
    const after = (await x.get(`/dev/projects/${project.id}`)).body.roadmap as Array<{
      id: string;
      parentId: string | null;
    }>;
    expect(after.find((n) => n.id === child.id)!.parentId).toBeNull();
    expect((await x.get('/dev/projects?status=idea')).body).toHaveLength(0);

    const ch = (
      await x
        .post('/dev/challenges', { title: 'Two Sum', platform: 'LeetCode', difficulty: 'easy' })
        .expect(201)
    ).body;
    expect(ch).toMatchObject({ status: 'todo', difficulty: 'easy', solvedAt: null });
    expect((await x.patch(`/dev/challenges/${ch.id}`, { status: 'solved' })).body.solvedAt).toEqual(
      expect.any(String),
    );
    expect(
      (await x.patch(`/dev/challenges/${ch.id}`, { status: 'todo' })).body.solvedAt,
    ).toBeNull();
    expect((await x.get('/dev/challenges?status=solved')).body).toHaveLength(0);
  });

  it('anotações por escopo com busca', async () => {
    const x = as(await registerUser());
    await x
      .post('/notes', {
        scope: 'dev',
        title: 'Ideia: CLI de hábitos',
        body: 'usar commander',
        tags: ['cli'],
      })
      .expect(201);
    await x.post('/notes', {
      scope: 'spiritual',
      title: 'Salmo 23',
      body: 'o Senhor é meu pastor',
    });
    expect((await x.get('/notes?scope=dev')).body).toHaveLength(1);
    expect((await x.get('/notes?q=pastor')).body).toHaveLength(1);
    expect((await x.get('/notes')).body).toHaveLength(2);
  });
});

describe('inglês e metas semanais', () => {
  it('vocabulário, revisão e resumo por habilidade com meta', async () => {
    freezeClock();
    const x = as(await registerUser());
    const word = (
      await x
        .post('/english/vocabulary', {
          term: 'resilient',
          meaning: 'resiliente',
          example: 'She is resilient.',
          tags: ['adjetivo'],
        })
        .expect(201)
    ).body;
    await x.post('/english/vocabulary', {
      kind: 'phrase',
      term: 'break the ice',
      meaning: 'quebrar o gelo',
    });
    expect(word).toMatchObject({ kind: 'word', status: 'new', reviewCount: 0, nextReviewAt: null });

    const reviewed = (await x.post(`/english/vocabulary/${word.id}/review`).expect(200)).body;
    expect(reviewed).toMatchObject({
      reviewCount: 1,
      status: 'learning',
      lastReviewedAt: expect.any(String),
    });
    expect(
      (await x.patch(`/english/vocabulary/${word.id}`, { status: 'mastered' })).body.status,
    ).toBe('mastered');
    expect((await x.get('/english/vocabulary?kind=phrase')).body).toHaveLength(1);
    expect((await x.get('/english/vocabulary?q=quebrar')).body).toHaveLength(1);

    await x.post('/time-entries', { minutes: 30, englishSkill: 'listening' }).expect(201);
    await x.post('/time-entries', { minutes: 20, englishSkill: 'speaking' });
    await x.post('/time-entries', { minutes: 10, kind: 'english' });
    await x.put('/targets/english', { metric: 'time_minutes', targetValue: 120 }).expect(200);

    const summary = (await x.get('/english/summary').expect(200)).body;
    expect(summary).toMatchObject({
      weekStart: '2026-11-16',
      totalMinutes: 60,
      practiceDays: 1,
      weeklyTargetMinutes: 120,
      minutesBySkill: { listening: 30, speaking: 20, reading: 0, writing: 0, untagged: 10 },
      vocabulary: { new: 1, learning: 0, mastered: 1 },
    });
  });

  it('metas semanais: valida a métrica por módulo e mostra o progresso real da semana', async () => {
    const x = as(await registerUser());
    expect((await x.put('/targets/health', { metric: 'pages_read', targetValue: 10 })).status).toBe(
      400,
    );
    const t = (
      await x.put('/targets/study', { metric: 'time_minutes', targetValue: 300 }).expect(200)
    ).body;
    expect(t).toMatchObject({
      scope: 'study',
      metric: 'time_minutes',
      targetValue: 300,
      currentValue: 0,
      weekStart: '2026-11-16',
    });
    await x.post('/time-entries', { minutes: 90, kind: 'study' });
    await x.post('/time-entries', { minutes: 45, kind: 'study', date: '2026-11-10' }); // semana anterior: não conta
    expect((await x.get('/targets')).body[0].currentValue).toBe(90);
    await x.put('/targets/study', { metric: 'time_minutes', targetValue: 600 });
    expect((await x.get('/targets')).body).toHaveLength(1);
    await x.delete('/targets/study').expect(204);
    expect((await x.get('/targets')).body).toEqual([]);
    expect((await x.put('/targets/yoga', { metric: 'time_minutes', targetValue: 1 })).status).toBe(
      400,
    );
  });
});

describe('leitura', () => {
  it('livro, sessões de leitura, conclusão automática, tempo e citações', async () => {
    freezeClock();
    const x = as(await registerUser());
    const book = (
      await x
        .post('/reading/books', {
          title: 'Hábitos Atômicos',
          author: 'James Clear',
          totalPages: 300,
        })
        .expect(201)
    ).body;
    expect(book).toMatchObject({ status: 'want_to_read', currentPage: 0, progress: 0 });

    const log1 = (
      await x
        .post(`/reading/books/${book.id}/logs`, { pagesRead: 30, minutes: 45, note: 'cap. 1' })
        .expect(201)
    ).body;
    expect(log1).toMatchObject({ pagesRead: 30, minutes: 45, date: TODAY });
    let b = (await x.get(`/reading/books/${book.id}`)).body;
    expect(b).toMatchObject({ status: 'reading', currentPage: 30, progress: 10, startedAt: TODAY });

    // tempo de leitura entra no livro-razão, ligado ao livro
    const entries = (await x.get('/time-entries')).body as Array<{
      kind: string;
      bookId: string;
      durationSeconds: number;
      areaId: string | null;
    }>;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: 'reading', bookId: book.id, durationSeconds: 2700 });
    expect(entries[0]!.areaId).not.toBeNull(); // área "Leitura" preenchida sozinha

    // informar a página em que parou calcula as páginas lidas
    const log2 = (await x.post(`/reading/books/${book.id}/logs`, { endPage: 120 }).expect(201))
      .body;
    expect(log2.pagesRead).toBe(90);
    expect(
      (await x.post(`/reading/books/${book.id}/logs`, {}).expect(400)).body.error.message,
    ).toBe('Informe as páginas lidas ou a página em que parou');

    // chegar na última página conclui o livro
    await x.post(`/reading/books/${book.id}/logs`, { endPage: 300 }).expect(201);
    b = (await x.get(`/reading/books/${book.id}`)).body;
    expect(b).toMatchObject({
      status: 'finished',
      currentPage: 300,
      progress: 100,
      finishedAt: TODAY,
    });
    expect((await x.patch(`/reading/books/${book.id}`, { rating: 5 })).body.rating).toBe(5);
    await x.patch(`/reading/books/${book.id}`, { rating: 9 }).expect(400);

    // apagar um log desfaz as páginas e o tempo
    await x.delete(`/reading/logs/${log1.id}`).expect(204);
    expect(((await x.get('/time-entries')).body as unknown[]).length).toBe(0);
    expect((await x.get(`/reading/books/${book.id}`)).body.currentPage).toBe(270);

    const quote = (
      await x
        .post(`/reading/books/${book.id}/quotes`, {
          text: 'Você não se eleva ao nível das suas metas…',
          page: 27,
        })
        .expect(201)
    ).body;
    expect((await x.patch(`/reading/quotes/${quote.id}`, { note: 'favorita' })).body.note).toBe(
      'favorita',
    );
    expect((await x.get(`/reading/books/${book.id}/quotes`)).body).toHaveLength(1);

    await x.put('/targets/reading', { metric: 'pages_read', targetValue: 100 });
    expect((await x.get('/reading/summary')).body).toMatchObject({
      pagesThisWeek: 90 + 180,
      readingDaysThisWeek: 1,
      booksFinishedThisYear: 1,
      weeklyTargetPages: 100,
    });
    expect((await x.get('/targets')).body[0].currentValue).toBe(270);

    await x.delete(`/reading/books/${book.id}`).expect(204);
    expect((await x.get('/reading/books')).body).toEqual([]);
  });

  it('não permite página atual maior que o total nem leitura no futuro', async () => {
    const x = as(await registerUser());
    const book = (await x.post('/reading/books', { title: 'Curto', totalPages: 50 })).body;
    await x.patch(`/reading/books/${book.id}`, { currentPage: 80 }).expect(400);
    await x
      .post(`/reading/books/${book.id}/logs`, { pagesRead: 5, date: '2026-12-25' })
      .expect(400);
    // terminar manualmente leva à última página
    expect((await x.patch(`/reading/books/${book.id}`, { status: 'finished' })).body).toMatchObject(
      { currentPage: 50, finishedAt: TODAY },
    );
  });
});

describe('saúde', () => {
  it('divisões de treino, registros com séries, tempo e frequência semanal', async () => {
    freezeClock();
    const x = as(await registerUser());
    const plan = (
      await x
        .post('/health/plans', {
          name: 'Treino A',
          weekdays: [1, 4],
          exercises: [{ name: 'Supino', sets: 4, reps: '8-10', restSeconds: 90 }],
        })
        .expect(201)
    ).body;
    expect(plan).toMatchObject({ weekdays: [1, 4], archived: false });

    const w1 = (
      await x
        .post('/health/workouts', {
          planId: plan.id,
          durationMinutes: 60,
          effort: 8,
          sets: [{ exercise: 'Supino', reps: 8, weightKg: 60 }],
        })
        .expect(201)
    ).body;
    expect(w1).toMatchObject({
      type: 'strength',
      title: 'Treino A',
      date: TODAY,
      planId: plan.id,
      durationMinutes: 60,
    });
    await x
      .post('/health/workouts', {
        type: 'walk',
        date: '2026-11-17',
        durationMinutes: 40,
        distanceKm: 4.2,
      })
      .expect(201);
    await x.post('/health/workouts', { type: 'walk', date: '2026-11-09', distanceKm: 3 });

    // o tempo do treino entra no livro-razão como "workout"
    const entries = (await x.get('/time-entries')).body as Array<{
      kind: string;
      durationSeconds: number;
    }>;
    expect(entries.filter((e) => e.kind === 'workout')).toHaveLength(2);

    await x.put('/targets/health', { metric: 'workout_sessions', targetValue: 4 });
    const freq = (await x.get('/health/frequency?weeks=3').expect(200)).body;
    expect(freq.weeklyTargetSessions).toBe(4);
    expect(freq.weeks.map((w: { start: string }) => w.start)).toEqual([
      '2026-11-02',
      '2026-11-09',
      '2026-11-16',
    ]);
    expect(freq.weeks[2]).toMatchObject({
      sessions: 2,
      minutes: 100,
      distanceKm: 4.2,
      byType: { strength: 1, walk: 1 },
    });
    expect(freq.weeks[1]).toMatchObject({ sessions: 1, distanceKm: 3 });
    expect((await x.get('/targets')).body[0]).toMatchObject({
      metric: 'workout_sessions',
      currentValue: 2,
    });

    // corrigir a duração reajusta o tempo; remover a duração apaga o registro de tempo
    await x.patch(`/health/workouts/${w1.id}`, { durationMinutes: 45 }).expect(200);
    expect(
      ((await x.get('/time-entries')).body as Array<{ durationSeconds: number }>)
        .map((e) => e.durationSeconds)
        .sort(),
    ).toEqual([2400, 2700]);
    await x.patch(`/health/workouts/${w1.id}`, { durationMinutes: null }).expect(200);
    expect(((await x.get('/time-entries')).body as unknown[]).length).toBe(1);
    await x.delete(`/health/workouts/${w1.id}`).expect(204);

    expect((await x.patch(`/health/plans/${plan.id}`, { archived: true })).body.archived).toBe(
      true,
    );
    expect((await x.get('/health/plans')).body).toEqual([]);
    expect((await x.get('/health/plans?includeArchived=true')).body).toHaveLength(1);
    await x.post('/health/workouts', { durationMinutes: 30, date: '2026-12-25' }).expect(400);
    await x
      .post('/health/workouts', { planId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);
  });
});

describe('espiritualidade', () => {
  it('devocional por dia, leitura bíblica, orações e resumo com sequência', async () => {
    freezeClock();
    const x = as(await registerUser());
    for (const day of ['2026-11-16', '2026-11-17']) {
      await x
        .put(`/spiritual/devotionals/${day}`, {
          passage: 'Salmo 23',
          reflection: `reflexão de ${day}`,
        })
        .expect(200);
    }
    // hoje ainda sem devocional: a sequência não quebra
    expect((await x.get('/spiritual/summary')).body).toMatchObject({
      devotionalStreak: 2,
      devotionalDaysThisWeek: 2,
    });
    const today = (
      await x
        .put(`/spiritual/devotionals/${TODAY}`, {
          title: 'Confiança',
          reflection: 'hoje',
          application: 'agradecer',
        })
        .expect(200)
    ).body;
    expect(today).toMatchObject({ date: TODAY, title: 'Confiança' });
    await x.put(`/spiritual/devotionals/${TODAY}`, { reflection: 'editado' }).expect(200); // um por dia: edita
    expect((await x.get('/spiritual/devotionals')).body).toHaveLength(3);
    await x.put('/spiritual/devotionals/2026-12-25', { reflection: 'x' }).expect(400);
    expect((await x.get('/spiritual/summary')).body.devotionalStreak).toBe(3);

    const r1 = (
      await x
        .post('/spiritual/bible-readings', { book: 'João', chapterFrom: 1, chapterTo: 3 })
        .expect(201)
    ).body;
    expect(r1).toMatchObject({ chapters: 3, date: TODAY });
    await x.post('/spiritual/bible-readings', { book: 'João', chapterFrom: 4 });
    await x
      .post('/spiritual/bible-readings', { book: 'João', chapterFrom: 5, chapterTo: 2 })
      .expect(400);
    await x.put('/targets/spiritual', { metric: 'bible_chapters', targetValue: 7 });

    const req = (
      await x.post('/spiritual/prayer-requests', { title: 'Saúde da família' }).expect(201)
    ).body;
    await x.post('/spiritual/prayer-logs', { minutes: 15, requestId: req.id }).expect(201);
    await x.post('/spiritual/prayer-logs', { notes: 'agradecimento' });
    await x
      .post('/spiritual/prayer-logs', { requestId: '00000000-0000-0000-0000-000000000000' })
      .expect(400);
    expect(
      ((await x.get('/time-entries')).body as Array<{ kind: string }>).filter(
        (e) => e.kind === 'spiritual',
      ),
    ).toHaveLength(1);

    expect(
      (
        await x.patch(`/spiritual/prayer-requests/${req.id}`, {
          status: 'answered',
          answerNote: 'Graças a Deus',
        })
      ).body,
    ).toMatchObject({
      status: 'answered',
      answeredAt: expect.any(String),
    });
    const summary = (await x.get('/spiritual/summary')).body;
    expect(summary).toMatchObject({
      chaptersThisWeek: 4,
      prayerMinutesThisWeek: 15,
      activeRequests: 0,
      answeredRequests: 1,
      weeklyTargetChapters: 7,
    });
    expect((await x.get('/targets')).body[0].currentValue).toBe(4);

    expect((await x.get('/spiritual/prayer-requests?status=active')).body).toHaveLength(0);
    await x.delete(`/spiritual/devotionals/${TODAY}`).expect(204);
    await x.delete(`/spiritual/devotionals/${TODAY}`).expect(404);
  });
});
