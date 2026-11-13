import { MAX_DAILY_FOCUS, type DayItem } from '@ritmo/shared';
import { Plus, Target } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { AreaLabel } from '@/components/shared/area-dot';
import { areaColorVar } from '@/lib/area-color';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAreaMap } from '@/features/areas/api';
import { formatTime } from '@/lib/dates';
import { formatDuration } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useSetFocus } from './api';

interface FocusCardProps {
  date: string;
  items: DayItem[];
  focusTaskIds: string[];
  onToggle: (item: DayItem) => void;
}

function FocusItem({ item, index, onToggle }: { item: DayItem; index: number; onToggle: (i: DayItem) => void }) {
  const areas = useAreaMap();
  const area = item.areaId ? areas.get(item.areaId) : undefined;
  const done = item.status === 'done';
  return (
    <li
      className={cn(
        'surface relative flex min-h-28 flex-col justify-between gap-3 overflow-hidden p-4 transition-all duration-300 hover:-translate-y-1',
        done && 'opacity-60',
      )}
      style={
        {
          '--tone': areaColorVar(area?.color),
          background:
            'radial-gradient(16rem 7rem at 0% 0%, color-mix(in oklab, var(--tone) 24%, transparent), transparent 70%), linear-gradient(145deg, rgb(255 255 255 / 0.07), transparent 50%), color-mix(in oklab, var(--card) 62%, transparent)',
          boxShadow: 'inset 0 1px 0 var(--glass-highlight), 0 14px 34px -18px var(--tone)',
        } as React.CSSProperties
      }
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, var(--tone), transparent)' }}
      />
      <div className="flex items-start gap-3">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary tabular">
          {index + 1}
        </span>
        <p className={cn('flex-1 text-sm font-medium leading-snug', done && 'line-through decoration-muted-foreground/50')}>
          {item.title}
        </p>
        <Checkbox
          checked={done}
          onCheckedChange={() => onToggle(item)}
          aria-label={done ? `Reabrir: ${item.title}` : `Concluir: ${item.title}`}
          className="size-5 rounded-full"
        />
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-9">
        <AreaLabel area={area} />
        {item.start ? <span className="text-xs text-muted-foreground tabular">{formatTime(new Date(item.start))}</span> : null}
        {item.durationMinutes ? <span className="text-xs text-muted-foreground tabular">{formatDuration(item.durationMinutes)}</span> : null}
      </div>
    </li>
  );
}

export function FocusCard({ date, items, focusTaskIds, onToggle }: FocusCardProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>([]);
  const setFocus = useSetFocus(date);

  const tasks = items.filter((i) => i.kind === 'task');
  const focused = focusTaskIds
    .map((id) => tasks.find((t) => t.refId === id))
    .filter((t): t is DayItem => !!t);
  const candidates = tasks.filter((t) => t.status !== 'done' || focusTaskIds.includes(t.refId));
  const emptySlots = Math.max(0, MAX_DAILY_FOCUS - focused.length);

  function openPicker() {
    setDraft(focusTaskIds);
    setOpen(true);
  }

  function toggleDraft(id: string) {
    setDraft((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : current.length < MAX_DAILY_FOCUS
          ? [...current, id]
          : current,
    );
  }

  function save() {
    setFocus.mutate(
      { taskIds: draft },
      {
        onSuccess: () => {
          setOpen(false);
          toast.success('Foco do dia atualizado');
        },
        onError: (error) => toast.error(errorMessage(error)),
      },
    );
  }

  return (
    <section aria-labelledby="focus-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="focus-title" className="flex items-center gap-2 text-sm font-semibold">
          <Target className="size-4 text-primary" aria-hidden />
          Foco do dia
          <span className="text-xs font-normal text-muted-foreground tabular">
            {focused.filter((f) => f.status === 'done').length}/{MAX_DAILY_FOCUS}
          </span>
        </h2>
        <Button variant="ghost" size="sm" onClick={openPicker} disabled={candidates.length === 0}>
          {focused.length > 0 ? 'Alterar' : 'Escolher'}
        </Button>
      </div>

      <ol className="grid gap-3 sm:grid-cols-3">
        {focused.map((item, index) => (
          <FocusItem key={item.id} item={item} index={index} onToggle={onToggle} />
        ))}
        {Array.from({ length: emptySlots }, (_, i) => (
          <li key={`empty-${i}`}>
            <button
              type="button"
              onClick={openPicker}
              disabled={candidates.length === 0}
              className="flex min-h-28 w-full flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="size-4" aria-hidden />
              {candidates.length === 0 ? 'Crie uma tarefa para hoje' : 'Escolher prioridade'}
            </button>
          </li>
        ))}
      </ol>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prioridades de hoje</DialogTitle>
            <DialogDescription>
              Escolha até {MAX_DAILY_FOCUS}. Selecionadas: {draft.length}.
            </DialogDescription>
          </DialogHeader>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {candidates.map((task) => {
              const checked = draft.includes(task.refId);
              const blocked = !checked && draft.length >= MAX_DAILY_FOCUS;
              return (
                <li key={task.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted',
                      blocked && 'cursor-not-allowed opacity-50',
                    )}
                  >
                    <Checkbox checked={checked} disabled={blocked} onCheckedChange={() => toggleDraft(task.refId)} />
                    {task.title}
                  </label>
                </li>
              );
            })}
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={setFocus.isPending}>
              {setFocus.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
