import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { clock } from '../../core/clock';
import { route, type AnyRoute } from '../../core/http/route';

export function systemRoutes({ db }: Deps): AnyRoute[] {
  return [
    route({
      method: 'get',
      path: '/health',
      tag: 'Sistema',
      summary: 'Saúde do serviço',
      description: 'Confere se a API está de pé e se o banco responde.',
      auth: false,
      response: z.object({
        status: z.enum(['ok', 'degraded']),
        database: z.enum(['ok', 'down']),
        time: z.iso.datetime(),
      }),
      async handler() {
        const database = await db.$queryRaw`SELECT 1`.then(
          () => 'ok' as const,
          () => 'down' as const,
        );
        return {
          status: database === 'ok' ? ('ok' as const) : ('degraded' as const),
          database,
          time: clock.now().toISOString(),
        };
      },
    }),
  ];
}
