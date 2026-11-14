import {
  periodicTargetSchema,
  setTargetInputSchema,
  targetScopeSchema,
  type PeriodicTarget,
  type TargetScope,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { badRequest } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { userClock } from '../../core/ownership';
import { allowedMetrics, weekOf, weeklyValue } from './progress';

export function targetsRoutes({ db }: Deps): AnyRoute[] {
  const tag = 'Metas semanais';

  async function view(userId: string, scope: TargetScope): Promise<PeriodicTarget | null> {
    const target = await db.periodicTarget.findUnique({
      where: { userId_scope: { userId, scope } },
    });
    if (!target) return null;
    const user = await userClock(db, userId);
    return {
      scope,
      metric: target.metric,
      targetValue: target.targetValue,
      currentValue: await weeklyValue(db, userId, user, scope, target.metric),
      weekStart: weekOf(user).start,
    };
  }

  return [
    route({
      method: 'get',
      path: '/targets',
      tag,
      summary: 'Metas semanais com o progresso da semana',
      description:
        'Uma meta por módulo (estudos, dev, inglês, leitura, saúde, espiritualidade). O progresso sai dos registros reais da ' +
        'semana atual: tempo registrado, treinos, páginas lidas, capítulos lidos ou vocabulário novo.',
      response: z.array(periodicTargetSchema),
      async handler({ userId }) {
        const rows = await db.periodicTarget.findMany({ where: { userId } });
        const out: PeriodicTarget[] = [];
        for (const row of rows) {
          const v = await view(userId, row.scope);
          if (v) out.push(v);
        }
        return out;
      },
    }),

    route({
      method: 'put',
      path: '/targets/:scope',
      tag,
      summary: 'Definir a meta semanal de um módulo',
      description:
        'Métricas aceitas por módulo — estudos/dev: tempo; inglês: tempo ou vocabulário novo; leitura: páginas ou tempo; ' +
        'saúde: treinos ou tempo; espiritualidade: capítulos ou tempo.',
      params: z.object({ scope: targetScopeSchema }),
      body: setTargetInputSchema,
      response: periodicTargetSchema,
      status: 200,
      async handler({ userId, params, body }) {
        if (!allowedMetrics(params.scope).includes(body.metric)) {
          throw badRequest(`Este módulo não aceita a métrica “${body.metric}”.`);
        }
        await db.periodicTarget.upsert({
          where: { userId_scope: { userId, scope: params.scope } },
          create: {
            userId,
            scope: params.scope,
            metric: body.metric,
            targetValue: body.targetValue,
          },
          update: { metric: body.metric, targetValue: body.targetValue },
        });
        return (await view(userId, params.scope))!;
      },
    }),

    route({
      method: 'delete',
      path: '/targets/:scope',
      tag,
      summary: 'Remover a meta semanal de um módulo',
      params: z.object({ scope: targetScopeSchema }),
      async handler({ userId, params }) {
        await db.periodicTarget.deleteMany({ where: { userId, scope: params.scope } });
      },
    }),
  ];
}
