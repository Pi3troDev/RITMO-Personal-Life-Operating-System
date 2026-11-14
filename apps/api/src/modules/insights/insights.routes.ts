import { insightSchema } from '@ritmo/shared';
import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { route, type AnyRoute } from '../../core/http/route';
import { userClock } from '../../core/ownership';
import { computeInsights } from './insights.service';

export function insightsRoutes({ db }: Deps): AnyRoute[] {
  return [
    route({
      method: 'get',
      path: '/insights',
      tag: 'Insights',
      summary: 'Insights calculados dos seus dados',
      description:
        'Regras determinísticas e reproduzíveis: objetivo parado (14 dias sem atividade), objetivo abaixo do ritmo, dia ' +
        'acima da capacidade, muitas tarefas atrasadas, queda de consistência em hábito (≥ 30 pontos entre duas quinzenas), ' +
        'sequência de 7+ dias, orçamento a 90% ou estourado e reserva que fecha depois da meta. Cada insight traz a ' +
        '`evidence` numérica. Sem dado suficiente, a regra não dispara — a lista pode vir vazia.',
      response: z.array(insightSchema),
      async handler({ userId }) {
        const user = await userClock(db, userId);
        const order = { attention: 0, positive: 1, neutral: 2 } as const;
        return (await computeInsights(db, userId, user)).sort(
          (a, b) => order[a.tone] - order[b.tone],
        );
      },
    }),
  ];
}
