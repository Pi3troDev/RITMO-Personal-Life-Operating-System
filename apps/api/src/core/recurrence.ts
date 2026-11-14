import { addDays, diffDays, startOfWeek, weekdayOf } from './time';

/**
 * Subconjunto de RRULE (RFC 5545) suficiente para o produto:
 * FREQ = DAILY | WEEKLY | MONTHLY | YEARLY, INTERVAL, BYDAY (semanal), BYMONTHDAY (mensal),
 * COUNT e UNTIL. Tudo é calculado em dias do calendário (`YYYY-MM-DD`), sem fuso.
 */
export type Freq = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export interface ParsedRule {
  freq: Freq;
  interval: number;
  /** 0 = domingo … 6 = sábado. */
  byDay: number[] | null;
  byMonthDay: number | null;
  count: number | null;
  /** Último dia (inclusive). */
  until: string | null;
}

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const FREQS = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
const MAX_SCAN_DAYS = 366 * 12;

/** Devolve `null` quando a regra é inválida ou usa partes que o produto não suporta. */
export function parseRule(rule: string): ParsedRule | null {
  const parts = new Map<string, string>();
  for (const piece of rule.replace(/^RRULE:/, '').split(';')) {
    const [key, value] = piece.split('=');
    if (!key || !value) return null;
    parts.set(key.toUpperCase(), value);
  }
  const freq = parts.get('FREQ');
  if (!freq || !FREQS.has(freq)) return null;

  const supported = new Set(['FREQ', 'INTERVAL', 'BYDAY', 'BYMONTHDAY', 'COUNT', 'UNTIL', 'WKST']);
  for (const key of parts.keys()) if (!supported.has(key)) return null;

  const interval = parts.has('INTERVAL') ? Number(parts.get('INTERVAL')) : 1;
  if (!Number.isInteger(interval) || interval < 1 || interval > 365) return null;

  let byDay: number[] | null = null;
  if (parts.has('BYDAY')) {
    if (freq !== 'WEEKLY') return null;
    byDay = [];
    for (const code of parts.get('BYDAY')!.split(',')) {
      const index = DAY_CODES.indexOf(code.toUpperCase());
      if (index === -1) return null;
      byDay.push(index);
    }
  }

  let byMonthDay: number | null = null;
  if (parts.has('BYMONTHDAY')) {
    if (freq !== 'MONTHLY') return null;
    byMonthDay = Number(parts.get('BYMONTHDAY'));
    if (!Number.isInteger(byMonthDay) || byMonthDay < 1 || byMonthDay > 31) return null;
  }

  let count: number | null = null;
  if (parts.has('COUNT')) {
    count = Number(parts.get('COUNT'));
    if (!Number.isInteger(count) || count < 1 || count > 5000) return null;
  }

  let until: string | null = null;
  if (parts.has('UNTIL')) {
    const match = /^(\d{4})(\d{2})(\d{2})/.exec(parts.get('UNTIL')!);
    if (!match) return null;
    until = `${match[1]}-${match[2]}-${match[3]}`;
  }
  if (count !== null && until !== null) return null;

  return { freq: freq as Freq, interval, byDay, byMonthDay, count, until };
}

export const isValidRule = (rule: string) => parseRule(rule) !== null;

function matches(rule: ParsedRule, day: string, first: string, weekStartsOn: number): boolean {
  switch (rule.freq) {
    case 'DAILY':
      return diffDays(day, first) % rule.interval === 0;
    case 'WEEKLY': {
      const weeks = diffDays(startOfWeek(day, weekStartsOn), startOfWeek(first, weekStartsOn)) / 7;
      if (weeks % rule.interval !== 0) return false;
      const wanted = rule.byDay ?? [weekdayOf(first)];
      return wanted.includes(weekdayOf(day));
    }
    case 'MONTHLY': {
      const months =
        (Number(day.slice(0, 4)) - Number(first.slice(0, 4))) * 12 +
        (Number(day.slice(5, 7)) - Number(first.slice(5, 7)));
      if (months % rule.interval !== 0) return false;
      return Number(day.slice(8, 10)) === (rule.byMonthDay ?? Number(first.slice(8, 10)));
    }
    case 'YEARLY': {
      const years = Number(day.slice(0, 4)) - Number(first.slice(0, 4));
      return years % rule.interval === 0 && day.slice(5) === first.slice(5);
    }
  }
}

/**
 * Dias em que a série que começa em `first` ocorre dentro de [from, to] (inclusive).
 * `first` é sempre a primeira ocorrência, mesmo que não satisfaça BYDAY.
 */
export function occurrenceDays(
  ruleText: string,
  first: string,
  from: string,
  to: string,
  weekStartsOn = 1,
): string[] {
  const rule = parseRule(ruleText);
  if (!rule || to < first) return [];

  const out: string[] = [];
  let seen = 0;
  const last = rule.until && rule.until < to ? rule.until : to;
  // Sem COUNT dá para começar direto em `from`; com COUNT é preciso contar desde o início.
  let day = rule.count === null && from > first ? from : first;

  for (
    let scanned = 0;
    day <= last && scanned <= MAX_SCAN_DAYS * 4;
    scanned++, day = addDays(day, 1)
  ) {
    const occurs = day === first || matches(rule, day, first, weekStartsOn);
    if (!occurs) continue;
    seen++;
    if (rule.count !== null && seen > rule.count) break;
    if (day >= from) out.push(day);
  }
  return out;
}

/** Primeira ocorrência estritamente depois de `after`, ou `null` se a série acabou. */
export function nextOccurrence(
  ruleText: string,
  first: string,
  after: string,
  weekStartsOn = 1,
): string | null {
  const probe = addDays(after, MAX_SCAN_DAYS);
  const days = occurrenceDays(ruleText, first, addDays(after, 1), probe, weekStartsOn);
  return days[0] ?? null;
}
