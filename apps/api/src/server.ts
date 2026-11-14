import { loadEnv } from './config/env';
import { createApp } from './app';
import { createDb } from './core/db';
import { createLogger } from './core/logger';
import { startScheduler } from './jobs/scheduler';

const env = loadEnv();
const logger = createLogger(env);
const db = createDb(env.DATABASE_URL);
const { app } = createApp({ env, db, logger });

const server = app.listen(env.PORT, () => {
  logger.info(
    `RITMO API em http://localhost:${env.PORT}  ·  Swagger em http://localhost:${env.PORT}/api/docs`,
  );
});

const stopScheduler = env.SCHEDULER_ENABLED ? startScheduler(db, logger) : () => undefined;

async function shutdown(signal: string) {
  logger.info(`${signal} recebido, encerrando…`);
  stopScheduler();
  server.close();
  await db.$disconnect();
  process.exit(0);
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
