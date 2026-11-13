import type { Task, TaskView } from '@ritmo/shared';
import { ListTodo, Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useBoard, useTasks, useUpdateTask } from './api';
import { Kanban } from './kanban';
import { NewTaskDialog } from './new-task-dialog';
import { TaskMeta } from './task-meta';

const VIEWS: { value: TaskView; label: string; empty: string }[] = [
  { value: 'all', label: 'Todas', empty: 'Nenhuma tarefa ainda. Crie a primeira com “Nova tarefa”.' },
  { value: 'today', label: 'Hoje', empty: 'Nada para hoje. Um dia livre também é um bom dia.' },
  { value: 'upcoming', label: 'Próximas', empty: 'Nenhuma tarefa com prazo futuro.' },
  { value: 'overdue', label: 'Atrasadas', empty: 'Nada atrasado. Bom ritmo.' },
  { value: 'done', label: 'Concluídas', empty: 'Você ainda não concluiu nenhuma tarefa.' },
];

function TaskRow({ task }: { task: Task }) {
  const update = useUpdateTask();
  const done = task.status === 'done';
  return (
    <li className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted/50">
      <Checkbox
        checked={done}
        className="mt-0.5 size-5 rounded-full"
        aria-label={done ? `Reabrir: ${task.title}` : `Concluir: ${task.title}`}
        onCheckedChange={() =>
          update.mutate(
            { id: task.id, status: done ? 'todo' : 'done' },
            { onError: (e) => toast.error(errorMessage(e)) },
          )
        }
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium leading-snug', done && 'text-muted-foreground line-through')}>
          {task.title}
        </p>
        <TaskMeta task={task} className="mt-1" />
      </div>
    </li>
  );
}

function TaskList({ view }: { view: TaskView }) {
  const { data, isPending, isError, error, refetch } = useTasks(view);
  const empty = VIEWS.find((v) => v.value === view)?.empty ?? '';

  if (isPending) return <RowsSkeleton />;
  if (isError) return <ErrorState error={error} onRetry={() => void refetch()} />;
  if (data.length === 0) return <EmptyState icon={ListTodo} title={empty} />;
  return (
    <ul className="divide-y divide-border/50 surface p-1">
      {data.map((task) => (
        <TaskRow key={task.id} task={task} />
      ))}
    </ul>
  );
}

function KanbanView() {
  const board = useBoard();
  const tasks = useTasks('all');
  if (board.isPending || tasks.isPending) return <RowsSkeleton rows={3} />;
  if (board.isError) return <ErrorState error={board.error} onRetry={() => void board.refetch()} />;
  if (tasks.isError) return <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />;
  return <Kanban board={board.data} tasks={tasks.data} />;
}

export function TasksPage() {
  const [layout, setLayout] = useState<'kanban' | 'list'>('kanban');
  const [view, setView] = useState<TaskView>('all');
  const [creating, setCreating] = useState(false);

  return (
    <>
      <PageHeader
        title="Tarefas"
        description="Arraste os cartões entre colunas ou use o menu de cada cartão."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden /> Nova tarefa
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs value={layout} onValueChange={(v) => setLayout(v as 'kanban' | 'list')}>
          <TabsList>
            <TabsTrigger value="kanban">Kanban</TabsTrigger>
            <TabsTrigger value="list">Lista</TabsTrigger>
          </TabsList>
        </Tabs>
        {layout === 'list' ? (
          <Tabs value={view} onValueChange={(v) => setView(v as TaskView)}>
            <TabsList className="max-w-full overflow-x-auto">
              {VIEWS.map((v) => (
                <TabsTrigger key={v.value} value={v.value}>
                  {v.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        ) : null}
      </div>

      {layout === 'kanban' ? <KanbanView /> : <TaskList view={view} />}
      <NewTaskDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
