import { defineConfig } from 'prisma/config';

// A URL de conexão vem do ambiente (ver .env.example). `prisma generate` não precisa dela.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: process.env.DATABASE_URL ?? 'mysql://ritmo:ritmo_dev@127.0.0.1:3310/ritmo',
    // Banco descartável que o `migrate dev` usa para comparar o schema com as migrações.
    shadowDatabaseUrl:
      process.env.SHADOW_DATABASE_URL ?? 'mysql://ritmo:ritmo_dev@127.0.0.1:3310/ritmo_shadow',
  },
});
