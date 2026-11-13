import { createTaskInputSchema, PROJECT_STATUS_LABELS, PROJECT_STATUSES, type ProjectStatus, type Task } from '@ritmo/shared';
import { ArrowLeft, ListTodo } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { AreaLabel } from '@/components/shared/area-dot';
import { ProgressBar } from '@/components/shared/progress';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAreaMap } from '@/features/areas/api';
import { useCreateTask, useUpdateTask } from '@/features/tasks/api';
import { TaskMeta } from '@/features/tasks/task-meta';
import { formatShortDate, fromDateKey } from '@/lib/dates';
import { errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useProject, useProjectTasks, useUpdateProject } from './api';

function TaskRow({ task }: { task: Task }) {
  const update = useUpdateTask();
  const done = task.status === 'done';
  return (
    <li className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-muted/50">
      <Checkbox
        checked={done}
        className="mt-0.5 size-5 rounded-full"
        aria-label={done ? `Reabrir: ${task.title}` : `Concluir: ${task.title}`}
        onCheckedChange={() =>
          update.mutate({ id: task.id, status: done ? 'todo' : 'done' }, { onError: (e) => toast.error(errorMessage(e)) })
        }
      />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-medium leading-snug', done && 'text-muted-foreground line-through')}>{task.title}</p>
        <TaskMeta task={task} className="mt-1" />
      </div>
    </li>
  );
}

export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const project = useProject(id);
  const tasks = useProjectTasks(id);
  const areas = useAreaMap();
  const updateProject = useUpdateProject();
  const createTask = useCreateTask();
  const [title, setTitle] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);

  function addTask(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createTaskInputSchema.safeParse({ title, projectId: id, areaId: project.data?.areaId ?? null });
    if (!parsed.success) {
      setTitleError(parsed.error.issues[0]?.message ?? 'Dê um título à tarefa');
      return;
    }
    createTask.mutate(parsed.data, {
      onSuccess: () => {
        setTitle('');
        toast.success('Tarefa adicionada ao projeto');
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  if (project.isPending) return <RowsSkeleton rows={3} />;
  if (project.isError) {
    return (
      <>
        <BackLink />
        <ErrorState error={project.error} onRetry={() => void project.refetch()} />
      </>
    );
  }

  const p = project.data;
  const area = p.areaId ? areas.get(p.areaId) : undefined;
  const total = p.openTaskCount + p.doneTaskCount;
  const open = tasks.data?.filter((t) => t.status !== 'done') ?? [];
  const done = tasks.data?.filter((t) => t.status === 'done') ?? [];

  return (
    <>
      <BackLink />
      <header className="surface-hero p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <AreaLabel area={area} />
            <h1 className="mt-1 text-[28px] font-semibold leading-tight tracking-tight">{p.name}</h1>
            {p.description ? <p className="mt-2 max-w-xl text-sm text-muted-foreground">{p.description}</p> : null}
          </div>
          <Select
            value={p.status}
            onValueChange={(status) =>
              updateProject.mutate({ id: p.id, status: status as ProjectStatus }, { onError: (e) => toast.error(errorMessage(e)) })
            }
          >
            <SelectTrigger className="w-40" aria-label="Status do projeto"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PROJECT_STATUSES.map((s) => <SelectItem key={s} value={s}>{PROJECT_STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-6 max-w-lg">
          <div className="mb-1.5 flex items-baseline justify-between text-sm tabular">
            <span className="text-muted-foreground">{total === 0 ? 'Sem tarefas ainda' : `${p.doneTaskCount} de ${total} tarefas concluídas`}</span>
            <span className="font-semibold">{p.progress}%</span>
          </div>
          <ProgressBar value={p.progress} className="h-2" label={`Progresso de ${p.name}`} />
          {p.dueDate ? <p className="mt-2 text-xs text-muted-foreground">Prazo: {formatShortDate(fromDateKey(p.dueDate))}</p> : null}
        </div>
      </header>

      <section aria-labelledby="project-tasks" className="mt-6">
        <h2 id="project-tasks" className="mb-3 text-sm font-semibold">Tarefas do projeto</h2>
        <form onSubmit={addTask} noValidate className="mb-4 flex gap-2">
          <div className="flex-1">
            <Input
              value={title}
              maxLength={200}
              placeholder="Adicionar uma tarefa a este projeto…"
              aria-label="Nova tarefa do projeto"
              aria-invalid={!!titleError}
              className="h-10"
              onChange={(e) => { setTitle(e.target.value); setTitleError(null); }}
            />
            {titleError ? <p role="alert" className="mt-1 text-xs text-destructive">{titleError}</p> : null}
          </div>
          <Button type="submit" className="h-10" disabled={createTask.isPending}>Adicionar</Button>
        </form>

        {tasks.isPending ? <RowsSkeleton rows={3} /> : null}
        {tasks.isError ? <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} /> : null}
        {tasks.data ? (
          tasks.data.length === 0 ? (
            <EmptyState icon={ListTodo} title="Nenhuma tarefa neste projeto" description="Adicione a primeira acima." />
          ) : (
            <div className="space-y-4">
              {open.length > 0 ? <ul className="surface p-1.5">{open.map((t) => <TaskRow key={t.id} task={t} />)}</ul> : null}
              {done.length > 0 ? (
                <div>
                  <p className="eyebrow px-1 pb-1.5">Concluídas</p>
                  <ul className="surface p-1.5">{done.map((t) => <TaskRow key={t.id} task={t} />)}</ul>
                </div>
              ) : null}
            </div>
          )
        ) : null}
      </section>
    </>
  );
}

function BackLink() {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 mb-3">
      <Link to="/projetos"><ArrowLeft aria-hidden /> Projetos</Link>
    </Button>
  );
}
