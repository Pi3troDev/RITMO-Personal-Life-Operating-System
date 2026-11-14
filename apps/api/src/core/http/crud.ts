import { z } from 'zod';
import { idSchema } from '@ritmo/shared';
import type { Db } from '../db';
import { notFound } from '../errors';
import { route, type AnyRoute } from './route';

type Op = 'list' | 'get' | 'create' | 'update' | 'delete';

/** Delegate mínimo do Prisma que o CRUD genérico usa. */
interface Delegate {
  findMany(args: unknown): Promise<unknown[]>;
  findFirst(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
  deleteMany(args: unknown): Promise<{ count: number }>;
}

export interface CrudOptions {
  db: Db;
  tag: string;
  /** Caminho relativo a `/api/v1`, no plural (ex.: `/study/tracks`). */
  path: string;
  /** Nomes para os resumos do Swagger: `['trilha', 'trilhas']`. */
  names: readonly [singular: string, plural: string];
  /** `true` quando o substantivo é feminino ("a trilha"): ajusta "Criar nova/novo". */
  feminine?: boolean;
  model: string;
  response: z.ZodType;
  create: z.ZodType;
  update: z.ZodType;
  query?: z.ZodType;
  where?: (query: never) => Record<string, unknown>;
  orderBy?: Record<string, unknown> | Array<Record<string, unknown>>;
  include?: Record<string, unknown>;
  toDto: (row: never) => unknown;
  toCreate: (
    input: never,
    userId: string,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  toUpdate: (
    input: never,
    userId: string,
    current: never,
  ) => Promise<Record<string, unknown>> | Record<string, unknown>;
  /** Roda depois de criar/atualizar (ex.: efeitos colaterais). */
  after?: (row: never, userId: string) => Promise<void>;
  only?: readonly Op[];
}

/**
 * CRUD padrão de um recurso do usuário. Toda consulta é filtrada por `userId`, e recurso de outro
 * usuário responde 404. Módulos com regras próprias acrescentam rotas específicas ao lado destas.
 */
export function crudRoutes(opts: CrudOptions): AnyRoute[] {
  const delegate = (opts.db as unknown as Record<string, Delegate>)[opts.model]!;
  const ops = new Set<Op>(opts.only ?? ['list', 'get', 'create', 'update', 'delete']);
  const [one, many] = opts.names;
  const idParams = z.object({ id: idSchema });
  const routes: AnyRoute[] = [];

  const load = async (userId: string, id: string) => {
    const row = await delegate.findFirst({
      where: { id, userId },
      ...(opts.include ? { include: opts.include } : {}),
    });
    if (!row) throw notFound();
    return row;
  };

  if (ops.has('list')) {
    routes.push(
      route({
        method: 'get',
        path: opts.path,
        tag: opts.tag,
        summary: `Listar ${many}`,
        query: opts.query ?? z.object({}),
        response: z.array(opts.response),
        async handler({ userId, query }) {
          const rows = await delegate.findMany({
            where: { userId, ...(opts.where ? opts.where(query as never) : {}) },
            ...(opts.orderBy ? { orderBy: opts.orderBy } : {}),
            ...(opts.include ? { include: opts.include } : {}),
          });
          return rows.map((row) => opts.toDto(row as never));
        },
      }),
    );
  }

  if (ops.has('create')) {
    routes.push(
      route({
        method: 'post',
        path: opts.path,
        tag: opts.tag,
        summary: `Criar ${one}`,
        body: opts.create,
        response: opts.response,
        async handler({ userId, body }) {
          const data = await opts.toCreate(body as never, userId);
          const row = await delegate.create({
            data: { userId, ...data },
            ...(opts.include ? { include: opts.include } : {}),
          });
          await opts.after?.(row as never, userId);
          return opts.toDto(row as never);
        },
      }),
    );
  }

  if (ops.has('get')) {
    routes.push(
      route({
        method: 'get',
        path: `${opts.path}/:id`,
        tag: opts.tag,
        summary: `Buscar ${one}`,
        params: idParams,
        response: opts.response,
        async handler({ userId, params }) {
          return opts.toDto((await load(userId, params.id)) as never);
        },
      }),
    );
  }

  if (ops.has('update')) {
    routes.push(
      route({
        method: 'patch',
        path: `${opts.path}/:id`,
        tag: opts.tag,
        summary: `Editar ${one}`,
        params: idParams,
        body: opts.update,
        response: opts.response,
        async handler({ userId, params, body }) {
          const current = await load(userId, params.id);
          const data = await opts.toUpdate(body as never, userId, current as never);
          const row = await delegate.update({
            where: { id: params.id },
            data,
            ...(opts.include ? { include: opts.include } : {}),
          });
          await opts.after?.(row as never, userId);
          return opts.toDto(row as never);
        },
      }),
    );
  }

  if (ops.has('delete')) {
    routes.push(
      route({
        method: 'delete',
        path: `${opts.path}/:id`,
        tag: opts.tag,
        summary: `Excluir ${one}`,
        params: idParams,
        async handler({ userId, params }) {
          const { count } = await delegate.deleteMany({ where: { id: params.id, userId } });
          if (count === 0) throw notFound();
        },
      }),
    );
  }
  return routes;
}

/** Remove chaves `undefined` para que o Prisma não tente gravá-las. */
export function defined<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as Partial<T>;
}
