#!/usr/bin/env node
/**
 * MariaDB de desenvolvimento do RITMO, isolado do projeto (não mexe no serviço MariaDB instalado).
 *
 *   npm run db:start    cria (na 1ª vez) e sobe o banco na porta 3310
 *   npm run db:stop     desliga
 *   npm run db:status   diz se está respondendo
 *
 * Os dados ficam em `.data/mariadb` (ignorado pelo git). Cria os bancos `ritmo`, `ritmo_test` e
 * `ritmo_shadow` e o usuário `ritmo` (senha `ritmo_dev`) — só para uso local.
 */
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const DATA = join(ROOT, '.data', 'mariadb');
const LOG = join(ROOT, '.data', 'mariadb.log');
const PORT = process.env.RITMO_DB_PORT ?? '3310';
const isWindows = process.platform === 'win32';
const exe = (name) => (isWindows ? `${name}.exe` : name);

function findBin() {
  if (process.env.MARIADB_BIN) return process.env.MARIADB_BIN;
  if (isWindows) {
    const base = 'C:\\Program Files';
    const dirs = readdirSync(base)
      .filter((d) => d.startsWith('MariaDB'))
      .sort()
      .reverse();
    for (const d of dirs)
      if (existsSync(join(base, d, 'bin', exe('mariadbd')))) return join(base, d, 'bin');
  }
  return null; // Linux/macOS: usa o PATH
}

const bin = findBin();
const tool = (name) => (bin ? join(bin, exe(name)) : name);

function client(args, opts = {}) {
  return spawnSync(tool('mariadb'), ['-uroot', `-P${PORT}`, '-h127.0.0.1', '--ssl=0', ...args], {
    encoding: 'utf8',
    ...opts,
  });
}

const isUp = () => client(['-e', 'SELECT 1']).status === 0;

async function waitUntilUp(seconds = 40) {
  for (let i = 0; i < seconds * 2; i++) {
    if (isUp()) return true;
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

function init() {
  if (existsSync(join(DATA, 'mysql'))) return;
  console.log('Criando o banco de desenvolvimento em .data/mariadb …');
  mkdirSync(DATA, { recursive: true });
  const result = spawnSync(
    tool('mariadb-install-db'),
    [`--datadir=${DATA}`, `--port=${PORT}`, '--password='],
    {
      encoding: 'utf8',
    },
  );
  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    throw new Error(
      'Não foi possível inicializar o MariaDB. Defina MARIADB_BIN com a pasta bin da instalação.',
    );
  }
}

async function start() {
  if (isUp()) return console.log(`MariaDB já está no ar na porta ${PORT}.`);
  init();
  mkdirSync(join(ROOT, '.data'), { recursive: true });
  const log = openSync(LOG, 'a');
  const args = [`--datadir=${DATA}`, `--port=${PORT}`, '--bind-address=127.0.0.1', '--console'];
  const defaults = join(DATA, 'my.ini');
  if (existsSync(defaults)) args.unshift(`--defaults-file=${defaults}`);
  spawn(tool('mariadbd'), args, {
    detached: true,
    stdio: ['ignore', log, log],
    windowsHide: true,
  }).unref();

  if (!(await waitUntilUp())) throw new Error(`O MariaDB não respondeu. Veja ${LOG}`);

  const sql = [
    'CREATE DATABASE IF NOT EXISTS ritmo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    'CREATE DATABASE IF NOT EXISTS ritmo_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    'CREATE DATABASE IF NOT EXISTS ritmo_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci',
    ...['%', 'localhost'].flatMap((host) => [
      `CREATE USER IF NOT EXISTS 'ritmo'@'${host}' IDENTIFIED BY 'ritmo_dev'`,
      ...['ritmo', 'ritmo_test', 'ritmo_shadow'].map(
        (db) => `GRANT ALL ON ${db}.* TO 'ritmo'@'${host}'`,
      ),
    ]),
  ].join(';\n');
  const result = client(['-e', sql]);
  if (result.status !== 0) throw new Error(result.stderr);
  console.log(
    `MariaDB no ar em 127.0.0.1:${PORT}  (bancos: ritmo, ritmo_test, ritmo_shadow · usuário: ritmo)`,
  );
}

function stop() {
  if (!isUp()) return console.log('MariaDB já estava desligado.');
  const result = spawnSync(
    tool('mariadb-admin'),
    ['-uroot', `-P${PORT}`, '-h127.0.0.1', '--ssl=0', 'shutdown'],
    {
      encoding: 'utf8',
    },
  );
  if (result.status !== 0) throw new Error(result.stderr);
  console.log('MariaDB desligado.');
}

const command = process.argv[2];
try {
  if (command === 'start') await start();
  else if (command === 'stop') stop();
  else if (command === 'status') console.log(isUp() ? `no ar (porta ${PORT})` : 'desligado');
  else {
    console.log('Uso: node scripts/db.mjs <start|stop|status>');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
