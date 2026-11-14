import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type Response,
} from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import type { Env } from './config/env';
import { createTokenService } from './core/auth/tokens';
import type { Db } from './core/db';
import type { Deps } from './core/deps';
import { AppError, notFound } from './core/errors';
import { buildOpenApi } from './core/http/openapi';
import { mountRoutes, type AnyRoute } from './core/http/route';
import type { Logger } from './core/logger';
import { allRoutes } from './routes';

export interface CreateAppOptions {
  env: Env;
  db: Db;
  logger: Logger;
}

export interface AppBundle {
  app: Express;
  deps: Deps;
  routes: AnyRoute[];
  openapi: Record<string, unknown>;
}

const API_PREFIX = '/api/v1';

/** Monta o Express sem abrir porta nenhuma: os testes usam isto direto com o Supertest. */
export function createApp({ env, db, logger }: CreateAppOptions): AppBundle {
  const tokens = createTokenService(env.JWT_SECRET, env.ACCESS_TOKEN_TTL_SECONDS);
  const deps: Deps = { db, env, tokens, logger };
  const routes = allRoutes(deps);
  const openapi = buildOpenApi(routes, { version: '0.1.0', serverUrl: API_PREFIX });

  const app = express();
  app.disable('x-powered-by');
  if (env.NODE_ENV === 'production') app.set('trust proxy', 1);

  // A interface do Swagger usa scripts e estilos inline; por isso ela tem um helmet menos rígido.
  app.use('/api/docs', helmet({ contentSecurityPolicy: false }));
  app.get('/api/openapi.json', (_req, res) => {
    res.json(openapi);
  });
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openapi, {
      customSiteTitle: 'RITMO API',
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        tryItOutEnabled: true,
      },
    }),
  );
  app.get('/', (_req, res) => {
    res.redirect('/api/docs');
  });

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const authLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: env.RATE_LIMIT_AUTH_MAX,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.',
        },
      });
    },
  });

  const router = express.Router();
  mountRoutes(router, routes, {
    verifier: tokens.verifier,
    validateResponses: env.NODE_ENV !== 'production',
    authLimiter,
  });
  app.use(API_PREFIX, router);

  app.use((_req, _res, next) => next(notFound('Rota não encontrada.')));

  const onError: ErrorRequestHandler = (error: unknown, req, res, _next) => {
    if (error instanceof AppError) {
      res.status(error.status).json({
        error: { code: error.code, message: error.message, details: error.details },
      });
      return;
    }
    const status = (error as { status?: number } | null)?.status;
    if (status === 400 && (error as { type?: string }).type === 'entity.parse.failed') {
      res
        .status(400)
        .json({
          error: { code: 'INVALID_JSON', message: 'O corpo da requisição não é um JSON válido.' },
        });
      return;
    }
    if (status === 413) {
      res
        .status(413)
        .json({
          error: { code: 'PAYLOAD_TOO_LARGE', message: 'O corpo da requisição é grande demais.' },
        });
      return;
    }
    // Detalhes internos ficam no log; o cliente recebe só uma mensagem genérica.
    logger.error({ err: error, method: req.method, url: req.originalUrl }, 'erro não tratado');
    res
      .status(500)
      .json({
        error: { code: 'INTERNAL', message: 'Algo deu errado do nosso lado. Tente novamente.' },
      });
  };
  app.use(onError);

  return { app, deps, routes, openapi };
}
