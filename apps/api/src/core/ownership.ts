import { badRequest, notFound } from './errors';
import type { Db } from './db';
import { clock } from './clock';
import { localDateOf } from './time';

type OwnedModel =
  | 'area'
  | 'project'
  | 'goal'
  | 'task'
  | 'event'
  | 'habit'
  | 'account'
  | 'financeCategory'
  | 'boardColumn'
  | 'board';

interface Countable {
  count(args: { where: { id: string; userId: string } }): Promise<number>;
}

const LABELS: Record<OwnedModel, string> = {
  area: 'Área inválida.',
  project: 'Projeto inválido.',
  goal: 'Objetivo inválido.',
  task: 'Tarefa inválida.',
  event: 'Compromisso inválido.',
  habit: 'Hábito inválido.',
  account: 'Conta inválida.',
  financeCategory: 'Categoria inválida.',
  boardColumn: 'Coluna inválida.',
  board: 'Quadro inválido.',
};

/**
 * Ao relacionar registros (tarefa → objetivo, evento → área…) confirmamos que o destino pertence
 * ao mesmo usuário. Sem isso, um id de outro usuário poderia ser vinculado e vazar dados.
 */
export async function assertOwned(
  db: Db,
  model: OwnedModel,
  userId: string,
  id: string | null | undefined,
): Promise<void> {
  if (!id) return;
  const delegate = db[model] as unknown as Countable;
  if ((await delegate.count({ where: { id, userId } })) === 0) throw badRequest(LABELS[model]);
}

/** Variante para o recurso principal da rota: não existe ou é de outro usuário → 404. */
export async function requireOwned(
  db: Db,
  model: OwnedModel,
  userId: string,
  id: string,
): Promise<void> {
  const delegate = db[model] as unknown as Countable;
  if ((await delegate.count({ where: { id, userId } })) === 0) throw notFound();
}

export interface UserClock {
  timezone: string;
  weekStartsOn: number;
  dailyCapacityMinutes: number;
  /** Dia de hoje no fuso do usuário. */
  today: string;
}

/** Fuso e preferências do usuário, com o "hoje" já resolvido. */
export async function userClock(db: Db, userId: string): Promise<UserClock> {
  const settings = await db.userSettings.findUnique({ where: { userId } });
  const timezone = settings?.timezone ?? 'America/Sao_Paulo';
  return {
    timezone,
    weekStartsOn: settings?.weekStartsOn ?? 1,
    dailyCapacityMinutes: settings?.dailyCapacityMinutes ?? 360,
    today: localDateOf(clock.now(), timezone),
  };
}
