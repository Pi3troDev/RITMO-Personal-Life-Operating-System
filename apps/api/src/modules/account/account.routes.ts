import {
  changePasswordInputSchema,
  deleteAccountInputSchema,
  MODULE_KEYS,
  moduleStateSchema,
  updateModulesInputSchema,
  updateProfileInputSchema,
  updateSettingsInputSchema,
  userSchema,
  userSettingsSchema,
  type UserSettings,
} from '@ritmo/shared';
import { z } from 'zod';
import { clock } from '../../core/clock';
import { hashPassword, verifyPassword } from '../../core/auth/password';
import type { Deps } from '../../core/deps';
import { badRequest, unauthorized } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { isValidTimezone } from '../../core/time';
import { REFRESH_COOKIE_PATH } from '../auth/auth.routes';
import { toUserDto } from './user.mapper';

export function accountRoutes({ db, env }: Deps): AnyRoute[] {
  async function loadUser(userId: string) {
    return db.user.findUniqueOrThrow({ where: { id: userId }, include: { settings: true } });
  }

  const settingsDto = (s: {
    timezone: string;
    locale: string;
    weekStartsOn: number;
    theme: 'dark' | 'light' | 'system';
    currency: string;
    dailyCapacityMinutes: number;
  }): UserSettings => ({
    timezone: s.timezone,
    locale: s.locale,
    weekStartsOn: s.weekStartsOn === 0 ? 0 : 1,
    theme: s.theme,
    currency: s.currency,
    dailyCapacityMinutes: s.dailyCapacityMinutes,
  });

  async function modulesState(userId: string) {
    const rows = await db.userModule.findMany({ where: { userId } });
    const byKey = new Map(rows.map((r) => [r.module, r.enabled]));
    return MODULE_KEYS.map((key) => ({ key, enabled: byKey.get(key) ?? true }));
  }

  function assertTimezone(tz: string | undefined) {
    if (tz !== undefined && !isValidTimezone(tz)) throw badRequest('Fuso horário inválido.');
  }

  return [
    route({
      method: 'get',
      path: '/me',
      tag: 'Conta',
      summary: 'Usuário atual',
      response: userSchema,
      async handler({ userId }) {
        const user = await loadUser(userId);
        return toUserDto(user, user.settings);
      },
    }),

    route({
      method: 'patch',
      path: '/me',
      tag: 'Conta',
      summary: 'Atualizar perfil',
      description: 'Nome, fuso horário, início da semana e capacidade diária de planejamento.',
      body: updateProfileInputSchema,
      response: userSchema,
      async handler({ userId, body }) {
        assertTimezone(body.timezone);
        const { name, ...settings } = body;
        if (name !== undefined) await db.user.update({ where: { id: userId }, data: { name } });
        if (Object.keys(settings).length > 0) {
          await db.userSettings.update({ where: { userId }, data: settings });
        }
        const user = await loadUser(userId);
        return toUserDto(user, user.settings);
      },
    }),

    route({
      method: 'post',
      path: '/me/password',
      tag: 'Conta',
      summary: 'Trocar senha',
      description: 'Exige a senha atual. Revoga todas as outras sessões do usuário.',
      body: changePasswordInputSchema,
      async handler({ userId, body, res }) {
        const user = await loadUser(userId);
        if (!(await verifyPassword(user.passwordHash, body.currentPassword))) {
          throw unauthorized('A senha atual está incorreta.');
        }
        await db.user.update({
          where: { id: userId },
          data: { passwordHash: await hashPassword(body.newPassword) },
        });
        await db.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: clock.now() },
        });
        res.clearCookie('ritmo_refresh', { path: REFRESH_COOKIE_PATH });
      },
    }),

    route({
      method: 'delete',
      path: '/me',
      tag: 'Conta',
      summary: 'Excluir conta',
      description: 'Apaga o usuário e TODOS os seus dados, de forma irreversível. Exige a senha.',
      body: deleteAccountInputSchema,
      async handler({ userId, body, res }) {
        const user = await loadUser(userId);
        if (!(await verifyPassword(user.passwordHash, body.password))) {
          throw unauthorized('A senha está incorreta.');
        }
        await db.user.delete({ where: { id: userId } });
        res.clearCookie('ritmo_refresh', { path: REFRESH_COOKIE_PATH, secure: env.COOKIE_SECURE });
      },
    }),

    route({
      method: 'get',
      path: '/settings',
      tag: 'Conta',
      summary: 'Preferências',
      response: userSettingsSchema,
      async handler({ userId }) {
        const settings = await db.userSettings.findUniqueOrThrow({ where: { userId } });
        return settingsDto(settings);
      },
    }),

    route({
      method: 'patch',
      path: '/settings',
      tag: 'Conta',
      summary: 'Atualizar preferências',
      description: 'Tema, moeda, idioma, fuso, início da semana e capacidade diária.',
      body: updateSettingsInputSchema,
      response: userSettingsSchema,
      async handler({ userId, body }) {
        assertTimezone(body.timezone);
        const settings = await db.userSettings.update({ where: { userId }, data: body });
        return settingsDto(settings);
      },
    }),

    route({
      method: 'get',
      path: '/settings/modules',
      tag: 'Conta',
      summary: 'Módulos ativos',
      description: 'Meu Dia e a captura rápida estão sempre ativos e não aparecem aqui.',
      response: z.array(moduleStateSchema),
      handler: ({ userId }) => modulesState(userId),
    }),

    route({
      method: 'put',
      path: '/settings/modules',
      tag: 'Conta',
      summary: 'Ligar ou desligar módulos',
      body: updateModulesInputSchema,
      response: z.array(moduleStateSchema),
      async handler({ userId, body }) {
        await db.$transaction(
          body.modules.map((m) =>
            db.userModule.upsert({
              where: { userId_module: { userId, module: m.key } },
              create: { userId, module: m.key, enabled: m.enabled },
              update: { enabled: m.enabled },
            }),
          ),
        );
        return modulesState(userId);
      },
    }),
  ];
}
