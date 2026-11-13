import type { DayItem } from '@ritmo/shared';
import { CalendarClock, Repeat, Target } from 'lucide-react';
import { Fragment } from 'react';
import { AreaLabel } from '@/components/shared/area-dot';
import { areaColorVar } from '@/lib/area-color';
import { useNow } from '@/lib/use-now';
import { Checkbox } from '@/components/ui/checkbox';
import { useAreaMap } from '@/features/areas/api';
import { formatTime } from '@/lib/dates';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';

interface TimelineProps {
  items: DayItem[];
  onToggle: (item: DayItem) => void;
  pendingId?: string | null;
}

function Row({ item, onToggle, busy }: { item: DayItem; onToggle: (i: DayItem) => void; busy: boolean }) {
  const areas = useAreaMap();
  const area = item.areaId ? areas.get(item.areaId) : undefined;
  const done = item.status === 'done';
  const skipped = item.status === 'skipped';
  const fixed = item.kind === 'event';

  return (
    <li
      className={cn(
        'grid grid-cols-[2.75rem_3px_minmax(0,1fr)_auto] items-start gap-x-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-muted/50',
        (done || skipped) && 'opacity-55',
      )}
    >
      <span className="pt-0.5 text-[13px] text-muted-foreground tabular">
        {item.start ? formatTime(new Date(item.start)) : '—'}
      </span>
      <span
        aria-hidden
        className={cn('mt-0.5 h-full min-h-9 rounded-full', !fixed && 'opacity-60')}
        style={{ backgroundColor: areaColorVar(area?.color) }}
      />
      <div className="min-w-0">
        <p className={cn('text-sm font-medium leading-snug', done && 'line-through decoration-muted-foreground/50')}>
          {item.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <AreaLabel area={area} />
          {item.durationMinutes ? (
            <span className="text-xs text-muted-foreground tabular">{formatDuration(item.durationMinutes)}</span>
          ) : null}
          {item.kind === 'habit' ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Repeat className="size-3" aria-hidden /> Hábito
            </span>
          ) : null}
          {fixed ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarClock className="size-3" aria-hidden /> Horário marcado
            </span>
          ) : null}
          {item.overdue ? <span className="text-xs font-medium text-warning">Atrasada</span> : null}
          {item.isFocus ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
              <Target className="size-3" aria-hidden /> Foco
            </span>
          ) : null}
          {skipped ? <span className="text-xs text-muted-foreground">Dia excepcional</span> : null}
        </div>
      </div>
      <div className="flex size-8 items-center justify-center">
        {!fixed ? (
          <Checkbox
            checked={done}
            disabled={busy || skipped}
            onCheckedChange={() => onToggle(item)}
            aria-label={done ? `Reabrir: ${item.title}` : `Concluir: ${item.title}`}
            className="size-5 rounded-full"
          />
        ) : null}
      </div>
    </li>
  );
}

function NowMarker({ now }: { now: Date }) {
  return (
    <li role="separator" aria-label="Agora" className="flex items-center gap-2 px-2 py-1">
      <span className="w-11 text-[11px] font-semibold text-primary tabular">{formatTime(now)}</span>
      <span aria-hidden className="size-2 rounded-full bg-primary ring-4 ring-primary/15" />
      <span aria-hidden className="h-px flex-1 bg-primary/40" />
      <span className="text-[11px] font-medium text-primary">agora</span>
    </li>
  );
}

export function Timeline({ items, onToggle, pendingId }: TimelineProps) {
  const scheduled = items.filter((i) => i.start);
  const flexible = items.filter((i) => !i.start);
  const now = useNow();
  const nowIndex = scheduled.findIndex((i) => new Date(i.start!).getTime() > now.getTime());
  const markerAt = nowIndex === -1 ? scheduled.length : nowIndex;

  return (
    <div className="space-y-5">
      {scheduled.length > 0 ? (
        <ol aria-label="Linha do tempo do dia" className="space-y-0.5">
          {scheduled.map((item, index) => (
            <Fragment key={item.id}>
              {index === markerAt ? <NowMarker now={now} /> : null}
              <Row item={item} onToggle={onToggle} busy={pendingId === item.id} />
            </Fragment>
          ))}
          {markerAt === scheduled.length ? <NowMarker now={now} /> : null}
        </ol>
      ) : null}
      {flexible.length > 0 ? (
        <div>
          <p className="eyebrow px-2 pb-1.5">Sem horário definido</p>
          <ul className="space-y-0.5">
            {flexible.map((item) => (
              <Row key={item.id} item={item} onToggle={onToggle} busy={pendingId === item.id} />
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
