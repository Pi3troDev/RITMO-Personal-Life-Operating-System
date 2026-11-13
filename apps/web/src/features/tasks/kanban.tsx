import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { Board, BoardColumn, Task } from '@ritmo/shared';
import { GripVertical, MoveRight } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useUpdateTask } from './api';
import { TaskMeta } from './task-meta';

function CardBody({ task, dragging }: { task: Task; dragging?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-3 shadow-sm',
        dragging && 'rotate-1 shadow-lg ring-1 ring-primary/40',
      )}
    >
      <p className={cn('pr-6 text-sm font-medium leading-snug', task.status === 'done' && 'text-muted-foreground line-through')}>
        {task.title}
      </p>
      <TaskMeta task={task} className="mt-2" />
    </div>
  );
}

function KanbanCard({ task, columns, onMove }: { task: Task; columns: BoardColumn[]; onMove: (taskId: string, columnId: string) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: task.id });
  return (
    <div ref={setNodeRef} className={cn('group relative', isDragging && 'opacity-40')}>
      <div className="flex items-stretch gap-1">
        <button
          type="button"
          className="flex w-5 shrink-0 cursor-grab touch-none items-center justify-center rounded text-muted-foreground opacity-60 hover:bg-muted hover:opacity-100 active:cursor-grabbing"
          aria-label={`Arrastar: ${task.title}`}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
        <div className="min-w-0 flex-1">
          <CardBody task={task} />
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            className="absolute right-1.5 top-1.5 opacity-0 focus-visible:opacity-100 group-hover:opacity-100 max-lg:opacity-100"
            aria-label={`Mover: ${task.title}`}
          >
            <MoveRight />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {columns
            .filter((c) => c.id !== task.columnId)
            .map((c) => (
              <DropdownMenuItem key={c.id} onSelect={() => onMove(task.id, c.id)}>
                Mover para {c.name}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function KanbanColumn({ column, tasks, columns, onMove }: { column: BoardColumn; tasks: Task[]; columns: BoardColumn[]; onMove: (taskId: string, columnId: string) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <section
      ref={setNodeRef}
      aria-label={column.name}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-xl bg-muted/40 p-2 transition-colors lg:w-auto lg:min-w-0 lg:flex-1',
        isOver && 'bg-primary-soft',
      )}
    >
      <h3 className="flex items-center justify-between px-2 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {column.name}
        <span className="rounded-full bg-muted px-2 py-0.5 text-2xs tabular">{tasks.length}</span>
      </h3>
      <div className="flex min-h-24 flex-1 flex-col gap-2">
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} columns={columns} onMove={onMove} />
        ))}
        {tasks.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs text-subtle-foreground">Solte um cartão aqui</p>
        ) : null}
      </div>
    </section>
  );
}

export function Kanban({ board, tasks }: { board: Board; tasks: Task[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const update = useUpdateTask();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const columns = [...board.columns].sort((a, b) => a.position - b.position);

  function move(taskId: string, columnId: string) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.columnId === columnId) return;
    update.mutate(
      { id: taskId, columnId },
      { onError: (error) => toast.error(errorMessage(error)) },
    );
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (event.over) move(String(event.active.id), String(event.over.id));
  }

  const active = tasks.find((t) => t.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveId(String(e.active.id))}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-3 scrollbar-thin lg:mx-0 lg:px-0">
        {columns.map((column) => (
          <KanbanColumn
            key={column.id}
            column={column}
            columns={columns}
            tasks={tasks.filter((t) => t.columnId === column.id).sort((a, b) => a.position - b.position)}
            onMove={move}
          />
        ))}
      </div>
      <DragOverlay>{active ? <CardBody task={active} dragging /> : null}</DragOverlay>
    </DndContext>
  );
}
