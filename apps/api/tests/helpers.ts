import { randomUUID } from 'node:crypto';
import type { Express } from 'express';
import request from 'supertest';
import { afterAll } from 'vitest';
import { createApp, type AppBundle } from '../src/app';
import { loadEnv } from '../src/config/env';
import { clock } from '../src/core/clock';
import { createDb, type Db } from '../src/core/db';
import { createLogger } from '../src/core/logger';

const env = loadEnv();
const db: Db = createDb(env.DATABASE_URL);
const bundle: AppBundle = createApp({ env, db, logger: createLogger(env) });

export const app: Express = bundle.app;
export const testDb = db;
export const testBundle = bundle;
export const API = '/api/v1';

/** "Agora" fixo dos testes: quarta-feira 2026-11-18, 12:00 em São Paulo (UTC-3). */
export const NOW = new Date('2026-11-18T15:00:00.000Z');
export const TODAY = '2026-11-18';

export function freezeClock(date: Date = NOW) {
  clock.set(() => date);
}
export function unfreezeClock() {
  clock.set(null);
}

afterAll(async () => {
  unfreezeClock();
  await db.$disconnect();
});

export interface TestUser {
  id: string;
  email: string;
  token: string;
  auth: { Authorization: string };
  /** Agente com o cookie do refresh token dessa sessão. */
  agent: ReturnType<typeof request.agent>;
}

export async function registerUser(name = 'Pessoa Teste'): Promise<TestUser> {
  const email = `${randomUUID()}@teste.ritmo`;
  const agent = request.agent(app);
  const res = await agent
    .post(`${API}/auth/register`)
    .send({ name, email, password: 'senha-forte-123' });
  if (res.status !== 201)
    throw new Error(`cadastro falhou: ${res.status} ${JSON.stringify(res.body)}`);
  const token = res.body.accessToken as string;
  return {
    id: res.body.user.id as string,
    email,
    token,
    auth: { Authorization: `Bearer ${token}` },
    agent,
  };
}

/** Atalhos que já mandam o token do usuário. */
export function as(user: TestUser) {
  return {
    get: (path: string) =>
      request(app)
        .get(API + path)
        .set(user.auth),
    post: (path: string, body?: object) =>
      request(app)
        .post(API + path)
        .set(user.auth)
        .send(body ?? {}),
    put: (path: string, body?: object) =>
      request(app)
        .put(API + path)
        .set(user.auth)
        .send(body ?? {}),
    patch: (path: string, body?: object) =>
      request(app)
        .patch(API + path)
        .set(user.auth)
        .send(body ?? {}),
    delete: (path: string, body?: object) =>
      request(app)
        .delete(API + path)
        .set(user.auth)
        .send(body ?? {}),
  };
}
