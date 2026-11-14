import type { Env } from '../config/env';
import type { TokenService } from './auth/tokens';
import type { Db } from './db';
import type { Logger } from './logger';

/** Dependências compartilhadas, injetadas em cada módulo (facilita testar sem rede). */
export interface Deps {
  db: Db;
  env: Env;
  tokens: TokenService;
  logger: Logger;
}
