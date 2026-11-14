import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { API, app, as, registerUser, testDb } from './helpers';

describe('autenticação', () => {
  it('cadastro cria o usuário com tudo pronto (áreas, quadro, categorias, preferências)', async () => {
    const user = await registerUser('Maria Silva');
    const api = as(user);

    const me = await api.get('/me').expect(200);
    expect(me.body).toMatchObject({
      name: 'Maria Silva',
      timezone: 'America/Sao_Paulo',
      weekStartsOn: 1,
      dailyCapacityMinutes: 360,
    });

    const areas = await api.get('/areas').expect(200);
    expect(areas.body.map((a: { name: string }) => a.name)).toEqual([
      'Trabalho',
      'Estudos',
      'Programação',
      'Inglês',
      'Academia',
      'Espiritualidade',
      'Leitura',
      'Pessoal',
      'Outros',
    ]);

    const board = await api.get('/boards/default').expect(200);
    expect(board.body.columns.map((c: { statusCategory: string }) => c.statusCategory)).toEqual([
      'backlog',
      'todo',
      'in_progress',
      'in_review',
      'done',
    ]);

    const categories = await api.get('/finance/categories').expect(200);
    expect(categories.body.length).toBeGreaterThanOrEqual(10);
  });

  it('a senha é guardada com Argon2id e nunca devolvida', async () => {
    const user = await registerUser();
    const row = await testDb.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(row.passwordHash.startsWith('$argon2id$')).toBe(true);
    const me = await as(user).get('/me');
    expect(JSON.stringify(me.body)).not.toContain('argon2');
  });

  it('rejeita e-mail repetido (sem diferenciar maiúsculas) e dados inválidos', async () => {
    const user = await registerUser();
    const dup = await request(app)
      .post(`${API}/auth/register`)
      .send({ name: 'Outra', email: user.email.toUpperCase(), password: 'senha-forte-123' });
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe('CONFLICT');

    const short = await request(app)
      .post(`${API}/auth/register`)
      .send({ name: 'X', email: 'nao-e-email', password: '123' });
    expect(short.status).toBe(400);
    expect(short.body.error.code).toBe('VALIDATION');
    expect(Array.isArray(short.body.error.details)).toBe(true);
  });

  it('login: senha errada e e-mail inexistente dão a mesma resposta genérica', async () => {
    const user = await registerUser();
    const wrong = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: 'errada-errada' });
    const ghost = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: 'ninguem@teste.ritmo', password: 'errada-errada' });
    expect(wrong.status).toBe(401);
    expect(ghost.status).toBe(401);
    expect(wrong.body.error.message).toBe(ghost.body.error.message);

    const ok = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: user.email.toUpperCase(), password: 'senha-forte-123' });
    expect(ok.status).toBe(200);
    expect(ok.body.accessToken).toEqual(expect.any(String));
    expect(ok.headers['set-cookie']?.[0]).toMatch(/ritmo_refresh=.*HttpOnly.*SameSite=Strict/i);
  });

  it('o refresh token vai em cookie httpOnly restrito ao caminho de autenticação', async () => {
    const user = await registerUser();
    const login = await request(app)
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: 'senha-forte-123' });
    const cookie = String(login.headers['set-cookie']?.[0]);
    expect(cookie).toContain('Path=/api/v1/auth');
    expect(cookie).toContain('HttpOnly');
    expect(login.body.refreshToken).toBeUndefined();
  });

  it('rotas protegidas exigem token válido', async () => {
    expect((await request(app).get(`${API}/me`)).status).toBe(401);
    expect((await request(app).get(`${API}/me`).set('Authorization', 'Bearer lixo')).status).toBe(
      401,
    );
    expect((await request(app).get(`${API}/tasks`).set('Authorization', 'Basic abc')).status).toBe(
      401,
    );
  });

  it('refresh rotaciona o token e devolve a sessão', async () => {
    const user = await registerUser();
    const first = await user.agent.post(`${API}/auth/refresh`).expect(200);
    expect(first.body.user.id).toBe(user.id);
    expect(first.body.accessToken).toEqual(expect.any(String));
    // o novo token funciona
    await request(app)
      .get(`${API}/me`)
      .set('Authorization', `Bearer ${first.body.accessToken}`)
      .expect(200);
    // o cookie foi trocado: o agente continua conseguindo renovar
    await user.agent.post(`${API}/auth/refresh`).expect(200);
  });

  it('reuso de um refresh token já trocado revoga a família inteira', async () => {
    const user = await registerUser();
    const stolen = String(
      user.agent.jar.getCookie('ritmo_refresh', {
        path: '/api/v1/auth',
        domain: '127.0.0.1',
        secure: false,
        script: false,
      } as never)?.value ?? '',
    );
    expect(stolen).not.toBe('');

    await user.agent.post(`${API}/auth/refresh`).expect(200); // troca legítima
    // fora da janela de tolerância (envelhece a revogação no banco), o token antigo é reapresentado
    const old = new Date(Date.now() - 60_000);
    await testDb.session.updateMany({
      where: { userId: user.id, revokedAt: { not: null } },
      data: { revokedAt: old, rotatedAt: old },
    });
    await request(app)
      .post(`${API}/auth/refresh`)
      .set('Cookie', `ritmo_refresh=${stolen}`)
      .expect(401);

    // a família toda foi revogada: nem o token novo, que era legítimo, funciona mais
    await user.agent.post(`${API}/auth/refresh`).expect(401);
    const alive = await testDb.session.count({ where: { userId: user.id, revokedAt: null } });
    expect(alive).toBe(0);
  });

  it('duas abas renovando ao mesmo tempo com o mesmo token não derrubam a sessão (janela de tolerância)', async () => {
    const user = await registerUser();
    const token = String(
      user.agent.jar.getCookie('ritmo_refresh', {
        path: '/api/v1/auth',
        domain: '127.0.0.1',
        secure: false,
        script: false,
      } as never)?.value ?? '',
    );
    await request(app)
      .post(`${API}/auth/refresh`)
      .set('Cookie', `ritmo_refresh=${token}`)
      .expect(200);
    await request(app)
      .post(`${API}/auth/refresh`)
      .set('Cookie', `ritmo_refresh=${token}`)
      .expect(200);
  });

  it('token revogado por logout-all não tem tolerância nenhuma', async () => {
    const user = await registerUser();
    const token = String(
      user.agent.jar.getCookie('ritmo_refresh', {
        path: '/api/v1/auth',
        domain: '127.0.0.1',
        secure: false,
        script: false,
      } as never)?.value ?? '',
    );
    await as(user).post('/auth/logout-all').expect(204);
    await request(app)
      .post(`${API}/auth/refresh`)
      .set('Cookie', `ritmo_refresh=${token}`)
      .expect(401);
  });

  it('logout revoga a sessão no servidor e limpa o cookie', async () => {
    const user = await registerUser();
    const out = await user.agent.post(`${API}/auth/logout`);
    expect(out.status).toBe(204);
    expect(String(out.headers['set-cookie']?.[0])).toMatch(/ritmo_refresh=;/);
    await user.agent.post(`${API}/auth/refresh`).expect(401);
  });

  it('refresh sem cookie é 401', async () => {
    await request(app).post(`${API}/auth/refresh`).expect(401);
  });

  it('trocar a senha exige a atual e derruba as outras sessões', async () => {
    const user = await registerUser();
    const api = as(user);
    await api
      .post('/me/password', { currentPassword: 'errada', newPassword: 'nova-senha-456' })
      .expect(401);
    await api
      .post('/me/password', { currentPassword: 'senha-forte-123', newPassword: 'nova-senha-456' })
      .expect(204);
    await user.agent.post(`${API}/auth/refresh`).expect(401);
    await request(app)
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: 'senha-forte-123' })
      .expect(401);
    await request(app)
      .post(`${API}/auth/login`)
      .send({ email: user.email, password: 'nova-senha-456' })
      .expect(200);
  });

  it('excluir a conta apaga o usuário e todos os dados', async () => {
    const user = await registerUser();
    const api = as(user);
    await api.post('/tasks', { title: 'vai embora' }).expect(201);
    await api.delete('/me', { password: 'errada' }).expect(401);
    await api.delete('/me', { password: 'senha-forte-123' }).expect(204);
    expect(await testDb.user.count({ where: { id: user.id } })).toBe(0);
    expect(await testDb.task.count({ where: { userId: user.id } })).toBe(0);
    expect(await testDb.area.count({ where: { userId: user.id } })).toBe(0);
  });

  it('JSON malformado e erros internos usam o formato padrão sem vazar detalhes', async () => {
    const bad = await request(app)
      .post(`${API}/auth/login`)
      .set('Content-Type', 'application/json')
      .send('{oops');
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe('INVALID_JSON');
    const missing = await request(app).get(`${API}/nao-existe`);
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('NOT_FOUND');
  });

  it('health responde sem autenticação', async () => {
    const res = await request(app).get(`${API}/health`).expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'ok' });
  });
});
