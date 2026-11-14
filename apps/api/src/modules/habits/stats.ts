import { addDays, weekdayOf } from '../../core/time';

export type CheckinStatus = 'done' | 'skipped';

export interface HabitStatsInput {
  /** Dias da semana agendados: 0 = domingo … 6 = sábado. */
  weekdays: number[];
  /** Dia em que o hábito foi criado (os dias anteriores não contam como "não feitos"). */
  createdDay: string;
  /** Check-ins por dia (`YYYY-MM-DD`). */
  checkins: ReadonlyMap<string, CheckinStatus>;
  today: string;
}

export interface HabitStats {
  currentStreak: number;
  bestStreak: number;
  /** Dias feitos ÷ dias agendados nos últimos 30 dias (sem hoje), 0–1. Dias excepcionais ficam de fora. */
  rate30d: number;
}

const MAX_LOOKBACK_DAYS = 1500;

/**
 * Regras (princípio "progresso sem julgamento"):
 * - `done` soma à sequência; `skipped` (dia excepcional) não soma nem quebra;
 * - um dia agendado sem registro quebra a sequência — exceto hoje, que ainda pode ser feito;
 * - dias anteriores à criação do hábito nunca contam contra ele.
 */
export function habitStats({ weekdays, createdDay, checkins, today }: HabitStatsInput): HabitStats {
  const scheduled = (day: string) => weekdays.includes(weekdayOf(day));

  let first = createdDay;
  for (const day of checkins.keys()) if (day < first) first = day;
  const floor = addDays(today, -MAX_LOOKBACK_DAYS);
  if (first < floor) first = floor;

  let currentStreak = 0;
  for (let day = today; day >= first; day = addDays(day, -1)) {
    if (!scheduled(day)) continue;
    const status = checkins.get(day);
    if (status === 'done') currentStreak++;
    else if (status === 'skipped') continue;
    else if (day === today) continue;
    else break;
  }

  let bestStreak = 0;
  let run = 0;
  for (let day = first; day <= today; day = addDays(day, 1)) {
    if (!scheduled(day)) continue;
    const status = checkins.get(day);
    if (status === 'done') {
      run++;
      if (run > bestStreak) bestStreak = run;
    } else if (status !== 'skipped' && day !== today) {
      run = 0;
    }
  }

  let due = 0;
  let done = 0;
  for (let back = 1; back <= 30; back++) {
    const day = addDays(today, -back);
    if (day < createdDay && !checkins.has(day)) continue;
    if (!scheduled(day)) continue;
    const status = checkins.get(day);
    if (status === 'skipped') continue;
    due++;
    if (status === 'done') done++;
  }

  return { currentStreak, bestStreak, rate30d: due === 0 ? 0 : done / due };
}
