import type { AgendaItem } from '@ritmo/shared';
import { isToday } from 'date-fns';
import { TriangleAlert } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { areaColorVar } from '@/lib/area-color';
import { useNow } from '@/lib/use-now';
import { useAreaMap } from '@/features/areas/api';
import { formatTime, WEEKDAY_SHORT } from '@/lib/dates';
import { cn } from '@/lib/utils';
import {
  GRID_HEIGHT,
  HOUR_END,
  HOUR_PX,
  HOUR_START,
  layoutDay,
  offsetForMinutes,
  type PositionedItem,
} from './layout';

/** Horizontal offset (in % of the column) between overlapping blocks. */
const CASCADE_STEP = 16;

const HOURS = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

function Block({
  positioned,
  onClick,
}: {
  positioned: PositionedItem;
  onClick: (item: AgendaItem) => void;
}) {
  const areas = useAreaMap();
  const { item, top, height, column, columns } = positioned;
  const area = item.areaId ? areas.get(item.areaId) : undefined;
  const color = areaColorVar(area?.color);
  const fixed = item.kind === 'event';
  const cancelled = item.status === 'cancelled';
  const done = item.status === 'done';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(item);
      }}
      title={`${item.title} · ${formatTime(new Date(item.start))}–${formatTime(new Date(item.end))}${fixed ? '' : ' (tarefa flexível)'}`}
      className={cn(
        'absolute overflow-hidden rounded-lg px-2 py-1 text-left text-[11px] leading-tight transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        fixed ? 'border-l-[3px]' : 'border border-dashed',
        item.conflict && 'ring-1 ring-warning/80',
        (cancelled || done) && 'opacity-55',
      )}
      style={{
        top,
        height: height - 2,
        // Overlapping blocks cascade instead of splitting the width, so titles stay readable.
        left: `calc(${column * CASCADE_STEP}% + 2px)`,
        width: `calc(${100 - (columns - 1) * CASCADE_STEP}% - 4px)`,
        zIndex: column + 1,
        borderColor: color,
        backgroundColor: fixed
          ? `color-mix(in oklab, ${color} 22%, var(--card))`
          : `color-mix(in oklab, ${color} 7%, transparent)`,
      }}
    >
      <span className={cn('flex items-start gap-1 font-medium', (cancelled || done) && 'line-through')}>
        <span className={cn('min-w-0 flex-1', height >= 56 ? 'line-clamp-3' : 'truncate')}>
          {item.title}
        </span>
        {item.conflict ? <TriangleAlert className="mt-px size-3 shrink-0 text-warning" aria-label="Conflito de horário" /> : null}
      </span>
      {height >= 40 ? (
        <span className="block whitespace-nowrap text-[10.5px] text-muted-foreground tabular">
          {columns > 1
            ? formatTime(new Date(item.start))
            : `${formatTime(new Date(item.start))}–${formatTime(new Date(item.end))}`}
        </span>
      ) : null}
    </button>
  );
}

interface TimeGridProps {
  days: Date[];
  items: AgendaItem[];
  onSlotClick: (slot: Date) => void;
  onItemClick: (item: AgendaItem) => void;
}

export function TimeGrid({ days, items, onSlotClick, onItemClick }: TimeGridProps) {
  const now = useNow();
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnsTemplate = `3.25rem repeat(${days.length}, minmax(0, 1fr))`;
  const compact = days.length > 1;
  const hasToday = days.some((d) => isToday(d));

  // Open scrolled to about an hour before now (or the morning, when today is not in view).
  useEffect(() => {
    // During the working day, start an hour before now; otherwise show the morning.
    const hour = new Date().getHours();
    const target = offsetForMinutes(hasToday && hour >= 9 && hour <= 17 ? (hour - 1) * 60 : 7 * 60);
    scrollRef.current?.scrollTo({ top: target });
    // Only on mount and when the visible days change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.getTime(), days.length]);

  const allDay = items.filter((i) => i.allDay);

  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto scrollbar-thin">
        <div className={cn(compact && 'min-w-[44rem]')}>
          <div className="grid border-b border-border/60 bg-card" style={{ gridTemplateColumns: columnsTemplate }}>
            <div />
            {days.map((day) => {
              const today = isToday(day);
              return (
                <div key={day.toISOString()} className="flex flex-col items-center gap-0.5 border-l border-border/40 py-2.5">
                  <span className={cn('eyebrow', today && 'text-primary')}>{WEEKDAY_SHORT[day.getDay()]}</span>
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-full text-sm font-semibold tabular',
                      today && 'bg-primary text-primary-foreground',
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
              );
            })}
          </div>

          {allDay.length > 0 ? (
            <div className="grid border-b border-border/60 py-1" style={{ gridTemplateColumns: columnsTemplate }}>
              <span className="px-1 pt-1 text-right text-[10px] text-subtle-foreground">dia todo</span>
              {days.map((day) => (
                <div key={day.toISOString()} className="space-y-0.5 border-l border-border/40 px-1">
                  {allDay
                    .filter((i) => new Date(i.start).toDateString() === day.toDateString())
                    .map((i) => (
                      <button key={i.id} type="button" onClick={() => onItemClick(i)} className="block w-full truncate rounded bg-primary-soft px-1.5 py-0.5 text-left text-[11px]">
                        {i.title}
                      </button>
                    ))}
                </div>
              ))}
            </div>
          ) : null}

          <div ref={scrollRef} className="relative max-h-[calc(100dvh-19rem)] min-h-[24rem] overflow-y-auto scrollbar-thin">
            <div className="relative grid" style={{ gridTemplateColumns: columnsTemplate, height: GRID_HEIGHT }}>
              <div className="relative" aria-hidden>
                {HOURS.map((hour) => (
                  <span
                    key={hour}
                    className="absolute right-2 -translate-y-1/2 text-[10px] text-subtle-foreground tabular"
                    style={{ top: (hour - HOUR_START) * HOUR_PX }}
                  >
                    {hour > HOUR_START ? `${String(hour).padStart(2, '0')}:00` : ''}
                  </span>
                ))}
              </div>

              {days.map((day) => {
                const positioned = layoutDay(items, day);
                const today = isToday(day);
                return (
                  <div
                    key={day.toISOString()}
                    role="group"
                    aria-label={`Horários de ${day.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}`}
                    className={cn('relative cursor-cell border-l border-border/40', today && 'bg-primary/[0.025]')}
                    onClick={(e) => {
                      if (e.target !== e.currentTarget && !(e.target as HTMLElement).dataset.slot) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const minutes = Math.floor(((y / HOUR_PX) * 60 + HOUR_START * 60) / 30) * 30;
                      const slot = new Date(day);
                      slot.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
                      onSlotClick(slot);
                    }}
                  >
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        data-slot="true"
                        className="pointer-events-auto absolute inset-x-0 border-t border-border/40"
                        style={{ top: (hour - HOUR_START) * HOUR_PX, height: HOUR_PX }}
                      />
                    ))}
                    {positioned.map((p) => (
                      <Block key={p.item.id} positioned={p} onClick={onItemClick} />
                    ))}
                    {today ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                        style={{ top: offsetForMinutes(now.getHours() * 60 + now.getMinutes()) }}
                      >
                        <span className="-ml-1 size-2 rounded-full bg-primary" />
                        <span className="h-px flex-1 bg-primary" />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
