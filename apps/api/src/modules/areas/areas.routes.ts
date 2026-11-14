import {
  areaSchema,
  createAreaInputSchema,
  idSchema,
  updateAreaInputSchema,
  type Area,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Deps } from '../../core/deps';
import { conflict, notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import type { Area as AreaRow } from '../../generated/prisma/client';

export const toAreaDto = (a: AreaRow): Area => ({
  id: a.id,
  name: a.name,
  color: a.color as Area['color'],
  icon: a.icon,
  position: a.position,
  archived: a.archivedAt !== null,
});

export function areasRoutes({ db }: Deps): AnyRoute[] {
  const idParams = z.object({ id: idSchema });

  return [
    route({
      method: 'get',
      path: '/areas',
      tag: 'Áreas',
      summary: 'Listar áreas',
      description: 'Por padrão só as ativas, na ordem escolhida pelo usuário.',
      query: z.object({ includeArchived: z.stringbool().optional() }),
      response: z.array(areaSchema),
      async handler({ userId, query }) {
        const areas = await db.area.findMany({
          where: { userId, ...(query.includeArchived ? {} : { archivedAt: null }) },
          orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        });
        return areas.map(toAreaDto);
      },
    }),

    route({
      method: 'post',
      path: '/areas',
      tag: 'Áreas',
      summary: 'Criar área',
      body: createAreaInputSchema,
      response: areaSchema,
      async handler({ userId, body }) {
        if (await db.area.findUnique({ where: { userId_name: { userId, name: body.name } } })) {
          throw conflict('Você já tem uma área com este nome.');
        }
        const last = await db.area.aggregate({ where: { userId }, _max: { position: true } });
        const area = await db.area.create({
          data: {
            userId,
            name: body.name,
            color: body.color,
            icon: body.icon ?? 'shapes',
            position: (last._max.position ?? -1) + 1,
          },
        });
        return toAreaDto(area);
      },
    }),

    route({
      method: 'patch',
      path: '/areas/:id',
      tag: 'Áreas',
      summary: 'Editar, reordenar ou arquivar área',
      params: idParams,
      body: updateAreaInputSchema,
      response: areaSchema,
      async handler({ userId, params, body }) {
        const current = await db.area.findFirst({ where: { id: params.id, userId } });
        if (!current) throw notFound();
        if (body.name && body.name !== current.name) {
          if (await db.area.findUnique({ where: { userId_name: { userId, name: body.name } } })) {
            throw conflict('Você já tem uma área com este nome.');
          }
        }
        const { archived, ...rest } = body;
        const area = await db.area.update({
          where: { id: current.id },
          data: {
            ...rest,
            ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
          },
        });
        return toAreaDto(area);
      },
    }),

    route({
      method: 'delete',
      path: '/areas/:id',
      tag: 'Áreas',
      summary: 'Excluir área',
      description:
        'Os itens que usavam a área ficam sem área (nada é apagado). Para esconder a área sem perder o vínculo, arquive.',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.area.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),
  ];
}
