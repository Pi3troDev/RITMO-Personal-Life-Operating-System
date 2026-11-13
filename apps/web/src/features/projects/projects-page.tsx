import { PROJECT_STATUS_LABELS, type Project, type ProjectStatus } from '@ritmo/shared';
import { FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { AreaLabel } from '@/components/shared/area-dot';
import { areaColorVar } from '@/lib/area-color';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAreaMap } from '@/features/areas/api';
import { formatShortDate, fromDateKey } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { useProjects } from './api';
import { NewProjectDialog } from './new-project-dialog';

const FILTERS: { value: ProjectStatus | 'all'; label: string }[] = [
  { value: 'active', label: 'Ativos' },
  { value: 'paused', label: 'Pausados' },
  { value: 'completed', label: 'Concluídos' },
  { value: 'all', label: 'Todos' },
];

function ProjectCard({ project }: { project: Project }) {
  const areas = useAreaMap();
  const area = project.areaId ? areas.get(project.areaId) : undefined;
  const total = project.openTaskCount + project.doneTaskCount;
  return (
    <Link
      to={`/projetos/${project.id}`}
      className="surface group relative flex flex-col gap-4 overflow-hidden p-5 transition-shadow hover:shadow-[var(--elevation-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px]" style={{ backgroundColor: areaColorVar(area?.color) }} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold leading-snug">{project.name}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <AreaLabel area={area} />
            {project.dueDate ? (
              <span className="text-xs text-muted-foreground">Prazo: {formatShortDate(fromDateKey(project.dueDate))}</span>
            ) : null}
          </div>
        </div>
        <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[11px]', project.status === 'active' ? 'bg-primary-soft' : 'bg-muted text-muted-foreground')}>
          {PROJECT_STATUS_LABELS[project.status]}
        </span>
      </div>
      {project.description ? <p className="line-clamp-2 text-sm text-muted-foreground">{project.description}</p> : null}
      <div className="mt-auto">
        <div className="mb-1.5 flex items-baseline justify-between text-xs text-muted-foreground tabular">
          <span>{total === 0 ? 'Sem tarefas ainda' : `${project.doneTaskCount} de ${total} tarefas`}</span>
          <span className="font-medium text-foreground">{project.progress}%</span>
        </div>
        <ProgressBar value={project.progress} label={`Progresso de ${project.name}`} />
      </div>
    </Link>
  );
}

export function ProjectsPage() {
  const [filter, setFilter] = useState<ProjectStatus | 'all'>('active');
  const [creating, setCreating] = useState(false);
  const { data, isPending, isError, error, refetch } = useProjects();
  const visible = data?.filter((p) => filter === 'all' || p.status === filter) ?? [];

  return (
    <>
      <PageHeader
        title="Projetos"
        description="Agrupe tarefas em projetos e veja o quanto cada um já avançou."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden /> Novo projeto
          </Button>
        }
      />
      <Tabs value={filter} onValueChange={(v) => setFilter(v as ProjectStatus | 'all')} className="mb-5">
        <TabsList>
          {FILTERS.map((f) => (
            <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      {isPending ? <RowsSkeleton rows={3} /> : null}
      {isError ? <ErrorState error={error} onRetry={() => void refetch()} /> : null}
      {data ? (
        visible.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Nenhum projeto nesta visão"
            description="Crie um projeto para reunir tarefas relacionadas."
            action={<Button variant="outline" size="sm" onClick={() => setCreating(true)}>Novo projeto</Button>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visible.map((project) => <ProjectCard key={project.id} project={project} />)}
          </div>
        )
      ) : null}
      <NewProjectDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
