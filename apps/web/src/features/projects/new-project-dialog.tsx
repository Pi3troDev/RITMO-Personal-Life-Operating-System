import { createProjectInputSchema } from '@ritmo/shared';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAreas } from '@/features/areas/api';
import { errorMessage } from '@/lib/http';
import { useCreateProject } from './api';

const NO_AREA = '__none__';

export function NewProjectDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [areaId, setAreaId] = useState(NO_AREA);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: areas } = useAreas();
  const create = useCreateProject();
  const navigate = useNavigate();

  function close(next: boolean) {
    if (!next) {
      setName('');
      setDescription('');
      setAreaId(NO_AREA);
      setDueDate('');
      setError(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = createProjectInputSchema.safeParse({
      name,
      description: description.trim() || null,
      areaId: areaId === NO_AREA ? null : areaId,
      dueDate: dueDate || null,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: (project) => {
        toast.success('Projeto criado');
        close(false);
        navigate(`/projetos/${project.id}`);
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo projeto</DialogTitle>
          <DialogDescription>Um projeto agrupa tarefas e mostra o quanto já avançou.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="project-name">Nome</Label>
            <Input id="project-name" autoFocus value={name} maxLength={100} aria-invalid={!!error} onChange={(e) => { setName(e.target.value); setError(null); }} />
            {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="project-desc">Descrição (opcional)</Label>
            <Textarea id="project-desc" rows={2} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
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
              <Label htmlFor="project-due">Prazo</Label>
              <Input id="project-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Criando…' : 'Criar projeto'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
