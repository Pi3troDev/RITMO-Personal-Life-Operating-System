import { GOAL_CATEGORY_LABELS, type Goal, type GoalStatus } from '@ritmo/shared';
import { Compass } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/shared/states';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { fromDateKey, formatShortDate } from '@/lib/dates';
import { errorMessage } from '@/lib/http';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { differenceInCalendarDays } from 'date-fns';
import { useGoals, useToggleMilestone } from './api';

const FILTERS: { value: GoalStatus | 'all'; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'all', label: 'Todos' },
];

const STALE_AFTER_DAYS = 14;

function metricText(goal: Goal): string | null {
  const m = goal.metric;
  if (!m) return null;
  if (m.kind === 'money') return `${formatCurrency(m.current)} de ${formatCurrency(m.target)}`;
  return `${m.current} de ${m.target} ${m.unit}`;
}

function GoalCard({ goal }: { goal: Goal }) {
  const toggle = useToggleMilestone();
  const daysLeft = goal.targetDate ? differenceInCalendarDays(fromDateKey(goal.targetDate), new Date()) : null;
  const idleDays = goal.lastActivityAt
    ? differenceInCalendarDays(new Date(), new Date(goal.lastActivityAt))
    : null;
  const stale = goal.status === 'active' && idleDays !== null && idleDays >= STALE_AFTER_DAYS;
  const metric = metricText(goal);

  return (
    <article className={cn('surface p-5', goal.status === 'paused' && 'opacity-75')}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{GOAL_CATEGORY_LABELS[goal.category]}</p>
          <h2 className="mt-0.5 text-base font-semibold leading-snug">{goal.name}</h2>
        </div>
        <p className="shrink-0 text-2xl font-semibold tabular">{goal.progress}%</p>
      </div>

      <ProgressBar value={goal.progress} className="mt-4" label={`Progresso de ${goal.name}`} />

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {metric ? <span className="tabular">{metric}</span> : null}
        {goal.targetDate ? (
          <span>
            Meta: {formatShortDate(fromDateKey(goal.targetDate))}
            {daysLeft !== null && daysLeft >= 0 ? ` · faltam ${daysLeft} dias` : null}
          </span>
        ) : null}
        {goal.habitIds.length > 0 ? <span>{goal.habitIds.length} hábito(s) ligado(s)</span> : null}
        {goal.openTaskCount + goal.doneTaskCount > 0 ? (
          <span className="tabular">
            Tarefas: {goal.doneTaskCount} feitas · {goal.openTaskCount} abertas
          </span>
        ) : null}
      </div>

      {goal.milestones.length > 0 ? (
        <ul className="mt-4 space-y-1 border-t pt-3">
          {goal.milestones.map((m) => (
            <li key={m.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-md px-1 py-1.5 text-sm hover:bg-muted/50">
                <Checkbox
                  checked={m.done}
                  className="mt-0.5"
                  onCheckedChange={(checked) =>
                    toggle.mutate(
                      { goalId: goal.id, milestoneId: m.id, done: checked === true },
                      { onError: (e) => toast.error(errorMessage(e)) },
                    )
                  }
                />
                <span className={cn('flex-1', m.done && 'text-muted-foreground line-through')}>{m.title}</span>
                {m.dueDate && !m.done ? (
                  <span className="text-xs text-muted-foreground tabular">{formatShortDate(fromDateKey(m.dueDate))}</span>
                ) : null}
              </label>
            </li>
          ))}
        </ul>
      ) : null}

      {stale ? (
        <p className="mt-4 rounded-lg bg-warning-soft px-3 py-2 text-xs">
          Sem movimentação há {idleDays} dias. Que tal definir um próximo passo pequeno?
        </p>
      ) : null}
    </article>
  );
}

export function GoalsPage() {
  const [filter, setFilter] = useState<GoalStatus | 'all'>('active');
  const { data, isPending, isError, error, refetch } = useGoals();
  const visible = data?.filter((g) => filter === 'all' || g.status === filter) ?? [];

  return (
    <>
      <PageHeader
        title="Objetivos"
        description="Cada objetivo conecta marcos, hábitos, tarefas e, quando faz sentido, dinheiro."
      />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as GoalStatus | 'all')} className="mb-5">
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isPending ? <RowsSkeleton rows={3} /> : null}
      {isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        visible.length === 0 ? (
          <EmptyState icon={Compass} title="Nenhum objetivo nesta visão" description="Os objetivos que você criar aparecem aqui." />
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {visible.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        )
      ) : null}
    </>
  );
}
