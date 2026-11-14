import { writeFileSync } from 'node:fs';
import { createApp } from '../src/app';
import { loadEnv } from '../src/config/env';
import { createDb } from '../src/core/db';
import { createLogger } from '../src/core/logger';

/** Gera `openapi.json` na raiz do pacote da API, sem precisar subir o servidor. */
const env = loadEnv();
const db = createDb(env.DATABASE_URL);
const { openapi } = createApp({ env, db, logger: createLogger(env) });
const target = new URL('../openapi.json', import.meta.url);
writeFileSync(target, JSON.stringify(openapi, null, 2) + '\n');
console.log(`OpenAPI gravado em ${target.pathname}`);
await db.$disconnect();
