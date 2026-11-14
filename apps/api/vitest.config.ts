import { defineConfig } from 'vitest/config';

const TEST_DB =
  process.env.TEST_DATABASE_URL ?? 'mysql://ritmo:ritmo_dev@127.0.0.1:3310/ritmo_test';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Todos os arquivos compartilham um único banco de teste; cada teste cria seus próprios usuários.
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DB,
      SHADOW_DATABASE_URL: TEST_DB,
      JWT_SECRET: 'segredo-de-teste-com-mais-de-trinta-e-dois-caracteres',
      RATE_LIMIT_AUTH_MAX: '100000',
      SCHEDULER_ENABLED: 'false',
      LOG_LEVEL: process.env.TEST_LOG_LEVEL ?? 'silent',
      COOKIE_SECURE: 'false',
    },
  },
});
