import { ChevronLeft, ChevronRight, Plus, TriangleAlert } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { PageHeader } from '@/components/shared/page-header';
import { ErrorState, RowsSkeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSession } from '@/features/auth/api';
import { fromDateKey, toDateKey, todayKey } from '@/lib/dates';
import { useAgenda } from './api';
import { EventDialog, type EventDialogState } from './event-dialog';
import { MonthGrid } from './month-grid';
import {
  isAgendaView,
  rangeLabel,
  shiftAnchor,
  visibleDays,
  visibleRange,
  type AgendaView,
} from './range';
import { TimeGrid } from './time-grid';

const VIEW_LABELS: Record<AgendaView, string> = { dia: 'Dia', semana: 'Semana', mes: 'Mês' };

function defaultView(): AgendaView {
  return window.matchMedia('(max-width: 1023px)').matches ? 'dia' : 'semana';
}

export function AgendaPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { data: user } = useSession();
  const weekStartsOn = user?.weekStartsOn ?? 1;
  const [dialog, setDialog] = useState<EventDialogState | null>(null);

  const viewParam = params.get('vista');
  const view = isAgendaView(viewParam) ? viewParam : defaultView();
  const anchor = useMemo(() => fromDateKey(params.get('data') ?? todayKey()), [params]);

  const days = useMemo(() => visibleDays(view, anchor, weekStartsOn), [view, anchor, weekStartsOn]);
  const { from, to } = visibleRange(days);
  const agenda = useAgenda(from, to);
  const items = agenda.data ?? [];
  const conflicts = items.filter((i) => i.conflict).length;

  function go(next: { view?: AgendaView; date?: Date }) {
    const nextParams = new URLSearchParams(params);
    nextParams.set('vista', next.view ?? view);
    nextParams.set('data', toDateKey(next.date ?? anchor));
    setParams(nextParams, { replace: true });
  }

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Compromissos têm horário marcado (blocos sólidos). Tarefas com horário são flexíveis (tracejadas)."
        actions={
          <Button onClick={() => setDialog({ mode: 'create', slot: roundedNow() })}>
            <Plus aria-hidden /> Novo compromisso
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-3">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => go({ date: new Date() })}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={() => go({ date: shiftAnchor(view, anchor, -1) })} aria-label="Período anterior">
            <ChevronLeft />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => go({ date: shiftAnchor(view, anchor, 1) })} aria-label="Próximo período">
            <ChevronRight />
          </Button>
        </div>
        <h2 className="text-base font-semibold" aria-live="polite">
          {rangeLabel(view, anchor, days)}
        </h2>
        {conflicts > 0 ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-1 text-xs">
            <TriangleAlert className="size-3.5 text-warning" aria-hidden />
            {conflicts} {conflicts === 1 ? 'bloco' : 'blocos'} com horário em conflito
          </span>
        ) : null}
        <Tabs value={view} onValueChange={(v) => go({ view: v as AgendaView })} className="ml-auto">
          <TabsList>
            {(Object.keys(VIEW_LABELS) as AgendaView[]).map((v) => (
              <TabsTrigger key={v} value={v}>
                {VIEW_LABELS[v]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {agenda.isPending ? <RowsSkeleton rows={6} /> : null}
      {agenda.isError ? <ErrorState error={agenda.error} onRetry={() => void agenda.refetch()} /> : null}

      {agenda.data ? (
        view === 'mes' ? (
          <MonthGrid
            days={days}
            anchor={anchor}
            weekStartsOn={weekStartsOn}
            items={items}
            onDayClick={(day) => go({ view: 'dia', date: day })}
          />
        ) : (
          <TimeGrid
            days={days}
            items={items}
            onSlotClick={(slot) => setDialog({ mode: 'create', slot })}
            onItemClick={(item) =>
              item.kind === 'event' ? setDialog({ mode: 'edit', item }) : navigate('/tarefas')
            }
          />
        )
      ) : null}

      <p className="mt-3 text-xs text-muted-foreground">
        Clique em um horário vazio para criar um compromisso. Tarefas com bloco de tempo são editadas em Tarefas.
      </p>

      {dialog ? (
        <EventDialog
          key={dialog.mode === 'edit' ? dialog.item.id : dialog.slot.toISOString()}
          state={dialog}
          onClose={() => setDialog(null)}
        />
      ) : null}
    </>
  );
}

function roundedNow(): Date {
  const now = new Date();
  now.setMinutes(now.getMinutes() < 30 ? 30 : 60, 0, 0);
  return now;
}
