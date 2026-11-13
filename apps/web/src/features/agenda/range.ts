import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toDateKey } from '@/lib/dates';

export type AgendaView = 'dia' | 'semana' | 'mes';
export const AGENDA_VIEWS: AgendaView[] = ['dia', 'semana', 'mes'];

export function isAgendaView(value: string | null): value is AgendaView {
  return value === 'dia' || value === 'semana' || value === 'mes';
}

type WeekStart = 0 | 1;

/** Every day shown by the view, including the leading/trailing days of the month grid. */
export function visibleDays(view: AgendaView, anchor: Date, weekStartsOn: WeekStart): Date[] {
  if (view === 'dia') return [anchor];
  if (view === 'semana') {
    const start = startOfWeek(anchor, { weekStartsOn });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }
  return eachDayOfInterval({
    start: startOfWeek(startOfMonth(anchor), { weekStartsOn }),
    end: endOfWeek(endOfMonth(anchor), { weekStartsOn }),
  });
}

export function visibleRange(days: Date[]): { from: string; to: string } {
  return { from: toDateKey(days[0]!), to: toDateKey(days[days.length - 1]!) };
}

/** Moves the anchor one view-unit forward (`1`) or back (`-1`). */
export function shiftAnchor(view: AgendaView, anchor: Date, direction: 1 | -1): Date {
  if (view === 'dia') return addDays(anchor, direction);
  if (view === 'semana') return addWeeks(anchor, direction);
  return addMonths(anchor, direction);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function rangeLabel(view: AgendaView, anchor: Date, days: Date[]): string {
  if (view === 'dia') return capitalize(format(anchor, "EEEE, d 'de' MMMM", { locale: ptBR }));
  if (view === 'mes') return capitalize(format(anchor, "MMMM 'de' yyyy", { locale: ptBR }));
  const first = days[0]!;
  const last = days[days.length - 1]!;
  const sameMonth = first.getMonth() === last.getMonth();
  const start = format(first, sameMonth ? 'd' : 'd MMM', { locale: ptBR }).replace('.', '');
  const end = format(last, 'd MMM yyyy', { locale: ptBR }).replace('.', '');
  return `${start} – ${end}`;
}
