import type { AgendaItem } from '@ritmo/shared';
import { isSameDay, isSameMonth, isToday } from 'date-fns';
import { TriangleAlert } from 'lucide-react';
import { AreaDot } from '@/components/shared/area-dot';
import { useAreaMap } from '@/features/areas/api';
import { WEEKDAY_SHORT } from '@/lib/dates';
import { cn } from '@/lib/utils';

const MAX_CHIPS = 3;

interface MonthGridProps {
  days: Date[];
  anchor: Date;
  weekStartsOn: 0 | 1;
  items: AgendaItem[];
  onDayClick: (day: Date) => void;
}

export function MonthGrid({ days, anchor, weekStartsOn, items, onDayClick }: MonthGridProps) {
  const areas = useAreaMap();
  const header = Array.from({ length: 7 }, (_, i) => WEEKDAY_SHORT[(i + weekStartsOn) % 7]);

  return (
    <div className="surface overflow-hidden">
      <div className="grid grid-cols-7 border-b border-border/60">
        {header.map((name) => (
          <div key={name} className="eyebrow py-2.5 text-center">
            {name}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayItems = items.filter((i) => isSameDay(new Date(i.start), day));
          const inMonth = isSameMonth(day, anchor);
          const hasConflict = dayItems.some((i) => i.conflict);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onDayClick(day)}
              aria-label={`${day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}: ${dayItems.length} ${dayItems.length === 1 ? 'item' : 'itens'}`}
              className={cn(
                'flex min-h-24 flex-col items-stretch gap-1 border-b border-l border-border/40 p-1.5 text-left transition-colors hover:bg-muted/50 sm:min-h-28',
                !inMonth && 'bg-muted/20 text-subtle-foreground',
              )}
            >
              <span className="flex items-center justify-between">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-medium tabular',
                    isToday(day) && 'bg-primary text-primary-foreground',
                  )}
                >
                  {day.getDate()}
                </span>
                {hasConflict ? <TriangleAlert className="size-3 text-warning" aria-label="Há conflito de horário" /> : null}
              </span>
              <span className="flex flex-col gap-0.5">
                {dayItems.slice(0, MAX_CHIPS).map((item) => (
                  <span
                    key={item.id}
                    className={cn(
                      'flex items-center gap-1 truncate rounded px-1 py-px text-[10.5px] leading-snug',
                      item.kind === 'event' ? 'bg-muted/70' : 'border border-dashed border-border',
                      item.status === 'cancelled' && 'line-through opacity-50',
                    )}
                  >
                    <AreaDot area={item.areaId ? areas.get(item.areaId) : undefined} className="size-1.5" />
                    <span className="truncate">{item.title}</span>
                  </span>
                ))}
                {dayItems.length > MAX_CHIPS ? (
                  <span className="px-1 text-[10.5px] text-muted-foreground">+{dayItems.length - MAX_CHIPS} mais</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
