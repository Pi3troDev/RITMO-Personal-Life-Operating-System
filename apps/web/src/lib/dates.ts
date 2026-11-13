import { format, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/** `YYYY-MM-DD` for a date in the user's local timezone. */
export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/** Local midnight of a `YYYY-MM-DD` key. */
export function fromDateKey(key: string): Date {
  return parseISO(key);
}

export function todayKey(): string {
  return toDateKey(new Date());
}

/** `YYYY-MM` for a date in the user's local timezone. */
export function toMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Quinta-feira, 12 de novembro" */
export function formatLongDate(date: Date): string {
  return capitalize(format(date, "EEEE, d 'de' MMMM", { locale: ptBR }));
}

/** "12 nov" — adds the year when it is not the current one. */
export function formatShortDate(date: Date): string {
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return format(date, sameYear ? 'd MMM' : "d MMM 'de' yyyy", { locale: ptBR }).replace('.', '');
}

/** "Hoje", "Amanhã", "Ontem" or a short date. */
export function formatRelativeDay(date: Date): string {
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  if (isYesterday(date)) return 'Ontem';
  return formatShortDate(date);
}

/** "novembro de 2026" */
export function formatMonth(date: Date): string {
  return format(date, "MMMM 'de' yyyy", { locale: ptBR });
}

/** "14:30" */
export function formatTime(date: Date): string {
  return format(date, 'HH:mm');
}

export function greeting(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Boa noite';
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'] as const;
export const WEEKDAY_INITIAL = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const;
