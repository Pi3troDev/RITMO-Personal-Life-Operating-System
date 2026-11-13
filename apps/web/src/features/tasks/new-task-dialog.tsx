import { createTaskInputSchema, TASK_PRIORITIES, TASK_PRIORITY_LABELS, type TaskPriority } from '@ritmo/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAreas } from '@/features/areas/api';
import { errorMessage } from '@/lib/http';
import { useCreateTask } from './api';

const NO_AREA = '__none__';

export function NewTaskDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [title, setTitle] = useState('');
  const [areaId, setAreaId] = useState(NO_AREA);
  const [priority, setPriority] = useState<TaskPriority>('none');
  const [dueDate, setDueDate] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const { data: areas } = useAreas();
  const create = useCreateTask();

  function close(next: boolean) {
    if (!next) {
      setTitle('');
      setAreaId(NO_AREA);
      setPriority('none');
      setDueDate('');
      setTitleError(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createTaskInputSchema.safeParse({
      title,
      areaId: areaId === NO_AREA ? null : areaId,
      priority,
      dueDate: dueDate || null,
    });
    if (!parsed.success) {
      setTitleError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('Tarefa criada');
        close(false);
      },
      onError: (error) => toast.error(errorMessage(error)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova tarefa</DialogTitle>
          <DialogDescription>Só o título é obrigatório. O resto você pode ajustar depois.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              autoFocus
              value={title}
              maxLength={200}
              aria-invalid={!!titleError}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(null);
              }}
            />
            {titleError ? <p role="alert" className="text-xs text-destructive">{titleError}</p> : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Área</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_AREA}>Sem área</SelectItem>
                  {areas?.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((p) => <SelectItem key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Prazo</Label>
            <Input id="task-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Criando…' : 'Criar tarefa'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
