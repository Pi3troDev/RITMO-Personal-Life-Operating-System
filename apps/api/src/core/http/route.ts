import type { NextFunction, Request, Response, Router } from 'express';
import { z } from 'zod';
import { badRequest } from '../errors';
import type { AuthVerifier } from '../auth/tokens';

export type HttpMethod = 'get' | 'post' | 'put' | 'patch' | 'delete';

export interface RouteContext<P, Q, B> {
  /** Usuário autenticado. Vazio nas rotas públicas (`auth: false`). */
  userId: string;
  params: P;
  query: Q;
  body: B;
  req: Request;
  res: Response;
}

/**
 * Definição declarativa de uma rota. É a única fonte de verdade para três coisas:
 * o roteamento do Express, a validação de entrada (Zod) e a documentação OpenAPI/Swagger.
 */
export interface RouteDef<
  P extends z.ZodType,
  Q extends z.ZodType,
  B extends z.ZodType,
  R extends z.ZodType,
> {
  method: HttpMethod;
  /** Caminho no estilo Express, relativo a `/api/v1` (ex.: `/tasks/:id`). */
  path: string;
  tag: string;
  summary: string;
  description?: string;
  /** Exige token de acesso. Padrão: `true`. */
  auth?: boolean;
  /** Aplica o limitador de tentativas das rotas de autenticação. */
  limited?: boolean;
  /** Status de sucesso. Padrão: 200 (204 sem `response`; 201 em `post` com `response`). */
  status?: number;
  params?: P;
  query?: Q;
  body?: B;
  response?: R;
  handler: (
    ctx: RouteContext<z.output<P>, z.output<Q>, z.output<B>>,
  ) => Promise<z.input<R> | void> | z.input<R> | void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyRoute = RouteDef<any, any, any, any>;

/** Só existe para inferir os tipos dos schemas a partir de cada definição. */
export function route<
  P extends z.ZodType = z.ZodUnknown,
  Q extends z.ZodType = z.ZodUnknown,
  B extends z.ZodType = z.ZodUnknown,
  R extends z.ZodType = z.ZodVoid,
>(def: RouteDef<P, Q, B, R>): RouteDef<P, Q, B, R> {
  return def;
}

export const successStatus = (def: AnyRoute) =>
  def.status ?? (def.response ? (def.method === 'post' ? 201 : 200) : 204);

function parseInput(schema: z.ZodType | undefined, value: unknown) {
  if (!schema) return undefined;
  const result = schema.safeParse(value);
  if (!result.success) {
    const issues = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    throw badRequest(issues[0]?.message ?? 'Dados inválidos.', issues);
  }
  return result.data;
}

export interface MountOptions {
  verifier: AuthVerifier;
  /** Valida também o corpo das respostas (desligado em produção). */
  validateResponses: boolean;
  /** Middlewares de limite de tentativas. */
  authLimiter: (req: Request, res: Response, next: NextFunction) => void;
}

/** Registra as rotas em um `Router` do Express. */
export function mountRoutes(router: Router, routes: AnyRoute[], options: MountOptions) {
  for (const def of routes) {
    const requiresAuth = def.auth !== false;
    const middlewares: Array<(req: Request, res: Response, next: NextFunction) => void> = [];
    if (def.limited) middlewares.push(options.authLimiter);

    router[def.method](
      def.path,
      ...middlewares,
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const userId = requiresAuth ? await options.verifier.fromRequest(req) : '';
          const params = parseInput(def.params, req.params);
          const query = parseInput(def.query, req.query);
          const body = parseInput(def.body, req.body ?? {});

          const result = await def.handler({ userId, params, query, body, req, res });
          if (res.headersSent) return;

          const status = successStatus(def);
          if (!def.response || status === 204) {
            res.status(status).end();
            return;
          }
          const payload = options.validateResponses ? def.response.parse(result) : result;
          res.status(status).json(payload);
        } catch (error) {
          next(error);
        }
      },
    );
  }
}
