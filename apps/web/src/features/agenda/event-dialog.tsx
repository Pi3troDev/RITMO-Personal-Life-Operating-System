import {
  createEventInputSchema,
  RECURRENCE_LABELS,
  RECURRENCE_PRESETS,
  type AgendaItem,
  type RecurrencePreset,
} from '@ritmo/shared';
import { format } from 'date-fns';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAreas } from '@/features/areas/api';
import { toDateKey } from '@/lib/dates';
import { errorMessage } from '@/lib/http';
import { useCreateEvent, useDeleteEvent, useUpdateEvent } from './api';

export type EventDialogState =
  | { mode: 'create'; slot: Date }
  | { mode: 'edit'; item: AgendaItem };

const NO_AREA = '__none__';
const NO_REMINDER = '__none__';
const REMINDERS = [5, 15, 30, 60];

function presetFor(rule: string | null): RecurrencePreset {
  const found = (Object.entries(RECURRENCE_PRESETS) as [RecurrencePreset, string | null][]).find(
    ([, value]) => value === rule,
  );
  // A custom rule created elsewhere is kept as "weekly" in the picker; saving does not rewrite it.
  return found ? found[0] : 'weekly';
}

/** Local `YYYY-MM-DD` and `HH:mm` → UTC ISO instant. */
function toInstant(date: string, time: string): string {
  return new Date(`${date}T${time}`).toISOString();
}

interface EventDialogProps {
  state: EventDialogState;
  onClose: () => void;
}

export function EventDialog({ state, onClose }: EventDialogProps) {
  const editing = state.mode === 'edit' ? state.item : null;
  const initialStart = editing ? new Date(editing.start) : state.mode === 'create' ? state.slot : new Date();
  const initialEnd = editing ? new Date(editing.end) : new Date(initialStart.getTime() + 60 * 60_000);

  const [title, setTitle] = useState(editing?.title ?? '');
  const [areaId, setAreaId] = useState(editing?.areaId ?? NO_AREA);
  const [date, setDate] = useState(toDateKey(initialStart));
  const [startTime, setStartTime] = useState(format(initialStart, 'HH:mm'));
  const [endTime, setEndTime] = useState(format(initialEnd, 'HH:mm'));
  const [recurrence, setRecurrence] = useState<RecurrencePreset>(presetFor(editing?.recurrence ?? null));
  const [reminder, setReminder] = useState(
    editing ? (editing.reminderMinutes === null ? NO_REMINDER : String(editing.reminderMinutes)) : '15',
  );
  const [location, setLocation] = useState(editing?.location ?? '');
  const [error, setError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const { data: areas } = useAreas();
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const remove = useDeleteEvent();
  const busy = create.isPending || update.isPending || remove.isPending;
  const isSeries = !!editing?.recurring;

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const payload = {
      title,
      areaId: areaId === NO_AREA ? null : areaId,
      start: toInstant(date, startTime),
      end: toInstant(date, endTime),
      location: location.trim() || null,
      recurrence: RECURRENCE_PRESETS[recurrence],
      reminderMinutes: reminder === NO_REMINDER ? null : Number(reminder),
    };
    const parsed = createEventInputSchema.safeParse(payload);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    const done = () => {
      toast.success(editing ? 'Compromisso atualizado' : 'Compromisso criado');
      onClose();
    };
    if (editing) {
      update.mutate({ id: editing.refId, ...parsed.data }, { onSuccess: done, onError: (e) => setError(errorMessage(e)) });
    } else {
      create.mutate(parsed.data, { onSuccess: done, onError: (e) => setError(errorMessage(e)) });
    }
  }

  function confirmDelete() {
    if (!editing) return;
    remove.mutate(editing.refId, {
      onSuccess: () => {
        toast.success(isSeries ? 'Série excluída' : 'Compromisso excluído');
        onClose();
      },
      onError: (e) => setError(errorMessage(e)),
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar compromisso' : 'Novo compromisso'}</DialogTitle>
          <DialogDescription>
            Compromissos têm horário marcado. Para trabalho flexível, use uma tarefa com bloco de tempo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Título</Label>
            <Input id="event-title" autoFocus value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-[1fr_auto_auto] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-date">Data</Label>
              <Input id="event-date" type="date" value={date} disabled={isSeries} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-start">Início</Label>
              <Input id="event-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-end">Término</Label>
              <Input id="event-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
          {isSeries ? (
            <p className="-mt-2 text-xs text-muted-foreground">
              Este compromisso se repete: mudar o horário vale para todas as ocorrências.
            </p>
          ) : null}
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
              <Label>Repetição</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as RecurrencePreset)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(RECURRENCE_LABELS) as RecurrencePreset[]).map((key) => (
                    <SelectItem key={key} value={key}>{RECURRENCE_LABELS[key]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Lembrete</Label>
              <Select value={reminder} onValueChange={setReminder}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_REMINDER}>Sem lembrete</SelectItem>
                  {REMINDERS.map((m) => <SelectItem key={m} value={String(m)}>{m} min antes</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-location">Local</Label>
              <Input id="event-location" value={location} maxLength={200} onChange={(e) => setLocation(e.target.value)} />
            </div>
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter className="sm:justify-between">
            {editing ? (
              confirmingDelete ? (
                <div className="flex items-center gap-2">
                  <Button type="button" variant="destructive" onClick={confirmDelete} disabled={busy}>
                    {isSeries ? 'Excluir toda a série' : 'Confirmar exclusão'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setConfirmingDelete(false)}>Voltar</Button>
                </div>
              ) : (
                <Button type="button" variant="ghost" className="text-destructive" onClick={() => setConfirmingDelete(true)}>
                  Excluir
                </Button>
              )
            ) : <span />}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Salvando…' : editing ? 'Salvar' : 'Criar'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
