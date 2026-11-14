import type { Db } from './db';
import { dayToDate, zonedInstant } from './time';
import type { EnglishSkill, TimeEntryKind } from '../generated/prisma/client';

/** Cor-token da área padrão de cada tipo de tempo, para preencher a área quando o usuário não escolheu. */
const AREA_COLOR_BY_KIND: Partial<Record<TimeEntryKind, string>> = {
  study: 'estudos',
  dev: 'programacao',
  english: 'ingles',
  workout: 'academia',
  reading: 'leitura',
  spiritual: 'espiritualidade',
};

export async function areaForKind(
  db: Db,
  userId: string,
  kind: TimeEntryKind,
): Promise<string | null> {
  const color = AREA_COLOR_BY_KIND[kind];
  if (!color) return null;
  const area = await db.area.findFirst({
    where: { userId, color, archivedAt: null },
    orderBy: { position: 'asc' },
  });
  return area?.id ?? null;
}

export interface LedgerInput {
  /** Registro de tempo já ligado ao log (se existir). */
  entryId: string | null;
  minutes: number | null | undefined;
  /** Dia (YYYY-MM-DD) em que o tempo foi gasto. */
  date: string;
  kind: TimeEntryKind;
  title: string;
  timezone: string;
  goalId?: string | null;
  bookId?: string | null;
  englishSkill?: EnglishSkill | null;
}

/**
 * Mantém o registro de tempo (`TimeEntry`) de um log de módulo em sincronia: cria quando há minutos,
 * atualiza quando mudam, apaga quando somem. É assim que leitura, treino e oração alimentam o
 * livro-razão único do tempo. Devolve o id do registro (ou `null`).
 */
export async function syncTimeEntry(
  db: Db,
  userId: string,
  input: LedgerInput,
): Promise<string | null> {
  if (!input.minutes) {
    if (input.entryId) await db.timeEntry.deleteMany({ where: { id: input.entryId, userId } });
    return null;
  }

  const startedAt = zonedInstant(input.date, 12 * 60, input.timezone);
  const data = {
    kind: input.kind,
    title: input.title,
    startedAt,
    endedAt: new Date(startedAt.getTime() + input.minutes * 60_000),
    durationSeconds: input.minutes * 60,
    localDate: dayToDate(input.date),
    goalId: input.goalId ?? null,
    bookId: input.bookId ?? null,
    englishSkill: input.englishSkill ?? null,
  };

  if (input.entryId) {
    const existing = await db.timeEntry.findFirst({ where: { id: input.entryId, userId } });
    if (existing) {
      await db.timeEntry.update({ where: { id: existing.id }, data });
      return existing.id;
    }
  }
  const created = await db.timeEntry.create({
    data: {
      userId,
      ...data,
      areaId: await areaForKind(db, userId, input.kind),
      source: 'manual',
      timerState: 'stopped',
    },
  });
  return created.id;
}

export async function dropTimeEntry(db: Db, userId: string, entryId: string | null) {
  if (entryId) await db.timeEntry.deleteMany({ where: { id: entryId, userId } });
}
