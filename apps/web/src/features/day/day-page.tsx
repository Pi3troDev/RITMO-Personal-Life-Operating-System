import type { DayItem, DayOverview } from '@ritmo/shared';
import { CalendarCheck, CalendarClock, Check, Clock, ListChecks, Repeat, type LucideIcon } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { areaColorVar } from '@/lib/area-color';
import { ProgressBar, ProgressRing } from '@/components/shared/progress';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/shared/states';
import { useAreaMap } from '@/features/areas/api';
import { useSession } from '@/features/auth/api';
import { formatLongDate, greeting, todayKey } from '@/lib/dates';
import { formatDuration, formatPercent } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useDay, useToggleDayItem } from './api';
import { FocusCard } from './focus-card';
import { ReflectionCard } from './reflection-card';
import { Timeline } from './timeline';

const QUOTES = [
  'Um passo de cada vez ainda é movimento.',
  'Consistência vale mais que intensidade.',
  'O dia de hoje não precisa ser perfeito para valer.',
  'Clareza primeiro, velocidade depois.',
  'Pequenas decisões repetidas constroem o futuro.',
];

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: string;
}) {
  return (
    <div
      className="glass relative flex min-w-0 flex-col items-start gap-2 rounded-2xl p-3 transition-transform duration-300 hover:-translate-y-0.5 sm:flex-row sm:items-center sm:gap-3"
      style={{ '--tone': tone } as React.CSSProperties}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--tone)_22%,transparent)] text-[var(--tone)] shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_6px_16px_-6px_var(--tone)]">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 max-w-full">
        <p className="eyebrow truncate">{label}</p>
        <p className="whitespace-nowrap text-xl font-semibold leading-tight tabular">{value}</p>
        {hint ? <p className="text-xs text-muted-foreground tabular">{hint}</p> : null}
      </div>
    </div>
  );
}

function Hero({ overview, firstName }: { overview: DayOverview; firstName?: string }) {
  const s = overview.summary;
  const quote = QUOTES[new Date().getDate() % QUOTES.length];
  const counted = overview.items.filter((i) => i.status !== 'skipped');
  const done = counted.filter((i) => i.status === 'done').length;

  return (
    <section className="surface-hero p-5 sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">{formatLongDate(new Date())}</p>
          <h1 className="mt-2 bg-gradient-to-br from-foreground via-foreground to-foreground/60 bg-clip-text font-serif text-[34px] leading-[1.05] tracking-tight text-transparent sm:text-5xl">
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="mt-3 max-w-md text-sm text-muted-foreground">{quote}</p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5">
          <ProgressRing
            value={s.completionRate}
            size={88}
            stroke={7}
            label={`${done} de ${counted.length} itens do dia concluídos`}
          >
            <span className="text-lg">{formatPercent(s.completionRate)}</span>
          </ProgressRing>
          <p className="text-xs text-muted-foreground tabular">
            {done} de {counted.length} itens
          </p>
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="Compromissos" value={String(s.eventsCount)} icon={CalendarClock} tone="var(--sky)" />
        <Metric
          label="Tarefas"
          value={`${s.tasksDone}/${s.tasksDone + s.tasksPending}`}
          hint="concluídas"
          icon={ListChecks}
          tone="var(--primary)"
        />
        <Metric
          label="Hábitos"
          value={`${s.habitsDone}/${s.habitsScheduled}`}
          hint="hoje"
          icon={Repeat}
          tone="var(--violet)"
        />
        <Metric
          label="Tempo dedicado"
          value={formatDuration(s.spentMinutes)}
          hint={`${s.activeGoals} objetivos ativos`}
          icon={Clock}
          tone="var(--coral)"
        />
      </dl>
    </section>
  );
}

function CapacityCard({ overview }: { overview: DayOverview }) {
  const s = overview.summary;
  const ratio = s.capacityMinutes > 0 ? s.plannedMinutes / s.capacityMinutes : 0;
  const over = s.plannedMinutes > s.capacityMinutes;
  return (
    <section aria-labelledby="capacity-title" className="surface p-5">
      <h2 id="capacity-title" className="text-sm font-semibold">
        Carga do dia
      </h2>
      <p className="mt-3 text-2xl font-semibold tabular">
        {formatDuration(s.plannedMinutes)}
        <span className="text-sm font-normal text-muted-foreground"> de {formatDuration(s.capacityMinutes)}</span>
      </p>
      <ProgressBar
        value={Math.min(ratio, 1) * 100}
        className="mt-3 h-2"
        color={over ? 'var(--warning)' : undefined}
        label="Tempo planejado em relação à capacidade do dia"
      />
      <p className={cn('mt-3 text-xs leading-relaxed', over ? 'text-warning' : 'text-muted-foreground')}>
        {over
          ? `Você planejou ${formatDuration(s.plannedMinutes - s.capacityMinutes)} além da sua capacidade. Vale adiar algo para outro dia.`
          : 'Dentro da sua capacidade. Sobra espaço para imprevistos.'}
      </p>
    </section>
  );
}

function HabitsCard({ items, onToggle }: { items: DayItem[]; onToggle: (item: DayItem) => void }) {
  const areas = useAreaMap();
  const habits = items.filter((i) => i.kind === 'habit');
  if (habits.length === 0) return null;
  return (
    <section aria-labelledby="habits-title" className="surface p-5">
      <h2 id="habits-title" className="text-sm font-semibold">
        Hábitos de hoje
      </h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {habits.map((habit) => {
          const done = habit.status === 'done';
          const area = habit.areaId ? areas.get(habit.areaId) : undefined;
          return (
            <li key={habit.id}>
              <button
                type="button"
                onClick={() => onToggle(habit)}
                aria-pressed={done}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
                  done
                    ? 'border-primary/40 bg-primary-soft text-foreground'
                    : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {done ? (
                  <Check className="size-3.5 text-primary" aria-hidden />
                ) : (
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: areaColorVar(area?.color) }} />
                )}
                {habit.title}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DayPage() {
  const date = todayKey();
  const { data: user } = useSession();
  const { data, isPending, isError, error, refetch } = useDay(date);
  const toggle = useToggleDayItem(date);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function onToggle(item: DayItem) {
    setPendingId(item.id);
    toggle.mutate(item, {
      onError: (e) => toast.error(errorMessage(e)),
      onSettled: () => setPendingId(null),
    });
  }

  return (
    <div className="space-y-6">
      {isPending ? <RowsSkeleton rows={5} /> : null}
      {isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}

      {data ? (
        <>
          <div className="rise" style={{ '--i': 0 } as React.CSSProperties}>
            <Hero overview={data} firstName={user?.name.split(' ')[0]} />
          </div>
          <div className="rise" style={{ '--i': 1 } as React.CSSProperties}>
            <FocusCard date={date} items={data.items} focusTaskIds={data.focusTaskIds} onToggle={onToggle} />
          </div>

          <div className="rise grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]" style={{ '--i': 2 } as React.CSSProperties}>
            <section aria-labelledby="timeline-title" className="surface p-3 sm:p-4">
              <h2 id="timeline-title" className="px-2 pb-2 pt-1 text-sm font-semibold">
                Seu dia
              </h2>
              {data.items.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="Seu dia está livre"
                  description="Capture uma tarefa com o botão +, ou aproveite o espaço. Um dia vazio também é válido."
                  className="border-0 py-8"
                />
              ) : (
                <Timeline items={data.items} onToggle={onToggle} pendingId={pendingId} />
              )}
            </section>
            <aside className="space-y-6">
              <CapacityCard overview={data} />
              <HabitsCard items={data.items} onToggle={onToggle} />
              <ReflectionCard date={date} reflection={data.reflection} />
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
}
