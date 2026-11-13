import type { Habit, HabitCheckin } from '@ritmo/shared';
import { Check, Pause, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { AreaLabel } from '@/components/shared/area-dot';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { useAreaMap } from '@/features/areas/api';
import { todayKey, WEEKDAY_SHORT } from '@/lib/dates';
import { errorMessage } from '@/lib/http';
import { formatPercent } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useHabitCheckins, useHabits, useSetCheckin } from './api';
import { ConsistencyCalendar } from './consistency-calendar';

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular">{value}</dd>
    </div>
  );
}

function HabitCard({ habit, checkins }: { habit: Habit; checkins: HabitCheckin[] }) {
  const areas = useAreaMap();
  const area = habit.areaId ? areas.get(habit.areaId) : undefined;
  const setCheckin = useSetCheckin();
  const today = todayKey();
  const todayStatus = checkins.find((c) => c.habitId === habit.id && c.date === today)?.status;
  const scheduledToday = habit.weekdays.includes(new Date().getDay());
  const paused = habit.status === 'paused';

  function toggleToday() {
    setCheckin.mutate(
      { habitId: habit.id, date: today, status: todayStatus === 'done' ? null : 'done' },
      { onError: (e) => toast.error(errorMessage(e)) },
    );
  }

  return (
    <article className={cn('surface p-5', paused && 'opacity-70')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-tight">{habit.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <AreaLabel area={area} />
            <span className="text-xs text-muted-foreground">
              {habit.weekdays.length === 7 ? 'Todos os dias' : habit.weekdays.map((d) => WEEKDAY_SHORT[d]).join(', ')}
            </span>
            {habit.targetValue ? (
              <span className="text-xs text-muted-foreground tabular">
                Meta: {habit.targetValue} {habit.targetUnit}
              </span>
            ) : null}
          </div>
        </div>
        {paused ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
            <Pause className="size-3" aria-hidden /> Pausado
          </span>
        ) : scheduledToday ? (
          <Button
            variant={todayStatus === 'done' ? 'secondary' : 'default'}
            size="sm"
            onClick={toggleToday}
            disabled={setCheckin.isPending}
            aria-pressed={todayStatus === 'done'}
          >
            {todayStatus === 'done' ? (
              <>
                <Check aria-hidden /> Feito hoje
              </>
            ) : (
              'Marcar hoje'
            )}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Não é hoje</span>
        )}
      </div>

      <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="overflow-x-auto pb-1 scrollbar-thin">
          <ConsistencyCalendar habit={habit} checkins={checkins} />
        </div>
        <dl className="flex gap-6">
          <Stat
            label="Sequência"
            value={habit.stats.currentStreak > 0 ? `${habit.stats.currentStreak} d` : '—'}
          />
          <Stat label="Melhor" value={`${habit.stats.bestStreak} d`} />
          <Stat label="30 dias" value={formatPercent(habit.stats.rate30d)} />
        </dl>
      </div>
    </article>
  );
}

export function HabitsPage() {
  const habits = useHabits();
  const checkins = useHabitCheckins();

  return (
    <>
      <PageHeader
        title="Hábitos"
        description="Consistência sustentável. Uma sequência interrompida não apaga o que você já construiu."
      />
      {habits.isPending || checkins.isPending ? <RowsSkeleton rows={3} /> : null}
      {habits.isError ? <ErrorState error={habits.error} onRetry={() => void habits.refetch()} /> : null}
      {checkins.isError ? <ErrorState error={checkins.error} onRetry={() => void checkins.refetch()} /> : null}
      {habits.data && checkins.data ? (
        habits.data.length === 0 ? (
          <EmptyState
            icon={Repeat}
            title="Nenhum hábito ainda"
            description="Comece com um hábito pequeno que você consiga manter mesmo nos dias ruins."
          />
        ) : (
          <>
            <div className="space-y-4">
              {habits.data.map((habit) => (
                <HabitCard key={habit.id} habit={habit} checkins={checkins.data} />
              ))}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Preenchido: feito · tracejado: dia excepcional (não quebra a sequência) · claro: previsto e sem registro.
            </p>
          </>
        )
      ) : null}
    </>
  );
}
