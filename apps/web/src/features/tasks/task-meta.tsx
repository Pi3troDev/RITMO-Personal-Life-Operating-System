import { TASK_PRIORITY_LABELS, type Task, type TaskPriority } from '@ritmo/shared';
import { CalendarDays, Clock, ListChecks } from 'lucide-react';
import { AreaLabel } from '@/components/shared/area-dot';
import { useAreaMap } from '@/features/areas/api';
import { formatRelativeDay } from '@/lib/dates';
import { formatDuration } from '@/lib/format';
import { cn } from '@/lib/utils';
import { fromDateKey, todayKey } from '@/lib/dates';

const PRIORITY_STYLE: Record<TaskPriority, string> = {
  none: '',
  low: 'text-muted-foreground',
  medium: 'text-info',
  high: 'text-warning',
  urgent: 'text-destructive',
};

export function PriorityTag({ priority }: { priority: TaskPriority }) {
  if (priority === 'none') return null;
  return <span className={cn('text-xs font-medium', PRIORITY_STYLE[priority])}>{TASK_PRIORITY_LABELS[priority]}</span>;
}

/** Secondary line of a task: area, due date, estimate, checklist progress, priority, tags. */
export function TaskMeta({ task, className }: { task: Task; className?: string }) {
  const areas = useAreaMap();
  const area = task.areaId ? areas.get(task.areaId) : undefined;
  const overdue = !!task.dueDate && task.dueDate < todayKey() && task.status !== 'done';
  const checklistDone = task.checklist.filter((c) => c.done).length;

  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', className)}>
      <AreaLabel area={area} />
      {task.dueDate ? (
        <span className={cn('inline-flex items-center gap-1 text-xs', overdue ? 'font-medium text-warning' : 'text-muted-foreground')}>
          <CalendarDays className="size-3" aria-hidden />
          {overdue ? 'Venceu ' : ''}
          {formatRelativeDay(fromDateKey(task.dueDate)).toLowerCase()}
        </span>
      ) : null}
      {task.estimateMinutes ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular">
          <Clock className="size-3" aria-hidden />
          {formatDuration(task.estimateMinutes)}
        </span>
      ) : null}
      {task.checklist.length > 0 ? (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular">
          <ListChecks className="size-3" aria-hidden />
          {checklistDone}/{task.checklist.length}
        </span>
      ) : null}
      <PriorityTag priority={task.priority} />
      {task.tags.map((tag) => (
        <span key={tag} className="text-xs text-subtle-foreground">
          #{tag}
        </span>
      ))}
    </div>
  );
}
