import { TZDate } from '@date-fns/tz';

/**
 * Datas e fusos. Convenção do projeto:
 * - instantes são `Date` (UTC);
 * - dias do calendário são strings `YYYY-MM-DD` interpretadas no fuso do usuário;
 * - colunas `DATE` do banco são lidas/escritas como `Date` à meia-noite UTC.
 */
const DAY_MS = 86_400_000;

export const isDay = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

/** Meia-noite UTC do dia `YYYY-MM-DD`, o formato que o Prisma usa para colunas `DATE`. */
export function dayToDate(day: string): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

/** Inverso de `dayToDate`. */
export function dateToDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: string, amount: number): string {
  return dateToDay(new Date(dayToDate(day).getTime() + amount * DAY_MS));
}

export function diffDays(later: string, earlier: string): number {
  return Math.round((dayToDate(later).getTime() - dayToDate(earlier).getTime()) / DAY_MS);
}

/** 0 = domingo … 6 = sábado. Independe de fuso: é aritmética de calendário. */
export function weekdayOf(day: string): number {
  return dayToDate(day).getUTCDay();
}

/** Primeiro dia da semana que contém `day`. `weekStartsOn`: 0 = domingo, 1 = segunda. */
export function startOfWeek(day: string, weekStartsOn: number): string {
  const offset = (weekdayOf(day) - weekStartsOn + 7) % 7;
  return addDays(day, -offset);
}

export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

export function endOfMonth(day: string): string {
  const [year, month] = day.split('-').map(Number) as [number, number];
  return dateToDay(new Date(Date.UTC(year, month, 0)));
}

export function addMonths(month: string, amount: number): string {
  const [year, m] = month.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(year, m - 1 + amount, 1));
  return date.toISOString().slice(0, 7);
}

/** Dia (no fuso `tz`) em que cai o instante. */
export function localDateOf(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** Minutos desde a meia-noite local em que cai o instante. */
export function localMinutesOf(instant: Date, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

/** Instante correspondente a `minutes` desde a meia-noite local do dia `day`. */
export function zonedInstant(day: string, minutes: number, tz: string): Date {
  const [year, month, date] = day.split('-').map(Number) as [number, number, number];
  const zoned = new TZDate(year, month - 1, date, Math.floor(minutes / 60), minutes % 60, 0, 0, tz);
  return new Date(zoned.getTime());
}

/** Intervalo [início, fim) de um dia local, em instantes UTC. */
export function dayRange(day: string, tz: string): { start: Date; end: Date } {
  return { start: zonedInstant(day, 0, tz), end: zonedInstant(addDays(day, 1), 0, tz) };
}

/** Intervalo [início, fim) cobrindo os dias `from`..`to` (inclusive). */
export function rangeOfDays(from: string, to: string, tz: string): { start: Date; end: Date } {
  return { start: zonedInstant(from, 0, tz), end: zonedInstant(addDays(to, 1), 0, tz) };
}

export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const minutesBetween = (a: Date, b: Date) =>
  Math.round((b.getTime() - a.getTime()) / 60_000);
