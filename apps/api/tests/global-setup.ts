import { execSync } from 'node:child_process';

const TEST_DB =
  process.env.TEST_DATABASE_URL ?? 'mysql://ritmo:ritmo_dev@127.0.0.1:3310/ritmo_test';

/** Aplica as migrações no banco de teste (e só nele) antes de todos os testes. */
export default function setup() {
  execSync('npx prisma migrate deploy', {
    cwd: new URL('..', import.meta.url),
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: TEST_DB },
  });
}
