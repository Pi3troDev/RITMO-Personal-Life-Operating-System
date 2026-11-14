import { randomUUID } from 'node:crypto';
import { authSessionSchema, loginInputSchema, registerInputSchema } from '@ritmo/shared';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { clock } from '../../core/clock';
import { DUMMY_HASH, hashPassword, verifyPassword } from '../../core/auth/password';
import { hashToken, newRefreshToken } from '../../core/auth/tokens';
import type { Deps } from '../../core/deps';
import { conflict, unauthorized } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { toUserDto } from '../account/user.mapper';
import { seedNewUser } from './seed';

export const REFRESH_COOKIE = 'ritmo_refresh';
/** Cookie restrito às rotas de autenticação: o navegador não o envia para o resto da API. */
export const REFRESH_COOKIE_PATH = '/api/v1/auth';
/** Janela em que reapresentar um token recém-trocado é tratado como corrida entre abas, não como roubo. */
const ROTATION_GRACE_MS = 10_000;

export function authRoutes({ db, env, tokens }: Deps): AnyRoute[] {
  const refreshTtlMs = env.REFRESH_TOKEN_TTL_DAYS * 86_400_000;

  function setRefreshCookie(res: Response, token: string) {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: refreshTtlMs,
    });
  }

  function clearRefreshCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
  }

  async function startSession(
    req: Request,
    res: Response,
    userId: string,
    familyId: string = randomUUID(),
  ) {
    const token = newRefreshToken();
    await db.session.create({
      data: {
        userId,
        familyId,
        tokenHash: hashToken(token),
        userAgent: req.headers['user-agent']?.slice(0, 255) ?? null,
        ipAddress: req.ip?.slice(0, 45) ?? null,
        expiresAt: new Date(clock.now().getTime() + refreshTtlMs),
      },
    });
    setRefreshCookie(res, token);
  }

  async function sessionPayload(userId: string) {
    const user = await db.user.findUniqueOrThrow({
      where: { id: userId },
      include: { settings: true },
    });
    return {
      accessToken: await tokens.signAccessToken(userId),
      user: toUserDto(user, user.settings),
    };
  }

  return [
    route({
      method: 'post',
      path: '/auth/register',
      tag: 'Autenticação',
      summary: 'Criar conta',
      description:
        'Cria o usuário e já prepara tudo que ele precisa: áreas padrão, quadro Kanban, categorias financeiras e preferências.',
      auth: false,
      limited: true,
      body: registerInputSchema,
      response: authSessionSchema,
      async handler({ body, req, res }) {
        const email = body.email.trim().toLowerCase();
        const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
        if (existing) throw conflict('Já existe uma conta com este e-mail.');

        const passwordHash = await hashPassword(body.password);
        const user = await db.$transaction(async (tx) => {
          const created = await tx.user.create({
            data: { email, name: body.name.trim(), passwordHash, lastLoginAt: clock.now() },
          });
          await seedNewUser(tx, created.id);
          return created;
        });

        await startSession(req, res, user.id);
        return sessionPayload(user.id);
      },
    }),

    route({
      method: 'post',
      path: '/auth/login',
      tag: 'Autenticação',
      summary: 'Entrar',
      description: 'Devolve o token de acesso e define o cookie do refresh token.',
      auth: false,
      limited: true,
      body: loginInputSchema,
      response: authSessionSchema,
      status: 200,
      async handler({ body, req, res }) {
        const user = await db.user.findUnique({
          where: { email: body.email.trim().toLowerCase() },
        });
        // Gasta o mesmo tempo com e-mail inexistente, para não revelar quais e-mails têm conta.
        const valid = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, body.password);
        if (!user || !valid) throw unauthorized('E-mail ou senha incorretos.');

        await db.user.update({ where: { id: user.id }, data: { lastLoginAt: clock.now() } });
        await startSession(req, res, user.id);
        return sessionPayload(user.id);
      },
    }),

    route({
      method: 'post',
      path: '/auth/refresh',
      tag: 'Autenticação',
      summary: 'Renovar sessão',
      description:
        'Troca o refresh token (cookie) por um novo par de tokens. O refresh é rotativo: o reuso de um token ' +
        'já trocado revoga toda a sessão.',
      auth: false,
      response: authSessionSchema,
      status: 200,
      async handler({ req, res }) {
        const presented = (req.cookies as Record<string, string | undefined> | undefined)?.[
          REFRESH_COOKIE
        ];
        if (!presented) throw unauthorized();

        const session = await db.session.findUnique({ where: { tokenHash: hashToken(presented) } });
        const now = clock.now();
        if (!session || session.expiresAt <= now) {
          clearRefreshCookie(res);
          throw unauthorized();
        }

        if (session.revokedAt) {
          // Só a rotação normal tem tolerância (duas abas renovando juntas). Logout, troca de senha
          // e revogação por reuso nunca têm: `rotatedAt` fica vazio nesses casos.
          const recentlyRotated =
            !!session.rotatedAt && now.getTime() - session.rotatedAt.getTime() < ROTATION_GRACE_MS;
          if (!recentlyRotated) {
            // Token já trocado sendo reapresentado fora da janela: trate como vazamento.
            await db.session.updateMany({
              where: { familyId: session.familyId, revokedAt: null },
              data: { revokedAt: now },
            });
            clearRefreshCookie(res);
            throw unauthorized();
          }
        } else {
          await db.session.update({
            where: { id: session.id },
            data: { revokedAt: now, rotatedAt: now, lastUsedAt: now },
          });
        }

        await startSession(req, res, session.userId, session.familyId);
        return sessionPayload(session.userId);
      },
    }),

    route({
      method: 'post',
      path: '/auth/logout',
      tag: 'Autenticação',
      summary: 'Sair',
      description:
        'Revoga no servidor a sessão do cookie atual e limpa o cookie. Sempre responde 204.',
      auth: false,
      async handler({ req, res }) {
        const presented = (req.cookies as Record<string, string | undefined> | undefined)?.[
          REFRESH_COOKIE
        ];
        if (presented) {
          const session = await db.session.findUnique({
            where: { tokenHash: hashToken(presented) },
          });
          if (session) {
            await db.session.updateMany({
              where: { familyId: session.familyId, revokedAt: null },
              data: { revokedAt: clock.now() },
            });
          }
        }
        clearRefreshCookie(res);
      },
    }),

    route({
      method: 'post',
      path: '/auth/logout-all',
      tag: 'Autenticação',
      summary: 'Sair de todos os dispositivos',
      description: 'Revoga todas as sessões do usuário.',
      body: z.object({}).optional(),
      async handler({ userId, res }) {
        await db.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: clock.now() },
        });
        clearRefreshCookie(res);
      },
    }),
  ];
}
