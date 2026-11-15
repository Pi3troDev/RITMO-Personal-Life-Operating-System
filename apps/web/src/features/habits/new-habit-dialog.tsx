import { createHabitInputSchema } from '@ritmo/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAreas } from '@/features/areas/api';
import { WEEKDAY_SHORT } from '@/lib/dates';
import { errorMessage } from '@/lib/http';
import { cn } from '@/lib/utils';
import { useCreateHabit } from './api';

const NO_AREA = '__none__';
const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const TARGETS = {
  check: 'Só marcar como feito',
  duration: 'Duração (minutos)',
  quantity: 'Quantidade',
} as const;

export function NewHabitDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [weekdays, setWeekdays] = useState<number[]>(EVERY_DAY);
  const [time, setTime] = useState('');
  const [areaId, setAreaId] = useState(NO_AREA);
  const [targetType, setTargetType] = useState<keyof typeof TARGETS>('check');
  const [targetValue, setTargetValue] = useState('');
  const [targetUnit, setTargetUnit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: areas } = useAreas();
  const create = useCreateHabit();

  function close(next: boolean) {
    if (!next) {
      setName('');
      setWeekdays(EVERY_DAY);
      setTime('');
      setAreaId(NO_AREA);
      setTargetType('check');
      setTargetValue('');
      setTargetUnit('');
      setError(null);
    }
    onOpenChange(next);
  }

  function toggleDay(day: number) {
    setError(null);
    setWeekdays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const value = targetValue.trim() === '' ? null : Number(targetValue.replace(',', '.'));
    const parsed = createHabitInputSchema.safeParse({
      name,
      weekdays,
      suggestedTime: time || null,
      areaId: areaId === NO_AREA ? null : areaId,
      targetType,
      targetValue: targetType === 'check' ? null : value,
      targetUnit:
        targetType === 'check'
          ? null
          : targetUnit.trim() || (targetType === 'duration' ? 'min' : null),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('Hábito criado');
        close(false);
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo hábito</DialogTitle>
          <DialogDescription>
            Comece pequeno: um hábito que você consiga manter mesmo nos dias ruins.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="habit-name">Nome</Label>
            <Input
              id="habit-name"
              autoFocus
              value={name}
              maxLength={80}
              aria-invalid={!!error}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium">Dias da semana</legend>
            <div className="flex gap-1.5">
              {WEEKDAY_SHORT.map((label, day) => {
                const on = weekdays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'h-9 flex-1 rounded-md border text-xs font-medium transition-colors',
                      on
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="habit-time">Horário sugerido</Label>
              <Input
                id="habit-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Área</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_AREA}>Sem área</SelectItem>
                  {areas?.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-[1fr_6rem_5rem] items-end gap-3">
            <div className="space-y-1.5">
              <Label>Meta</Label>
              <Select
                value={targetType}
                onValueChange={(v) => setTargetType(v as keyof typeof TARGETS)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TARGETS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Input
              aria-label="Valor da meta"
              inputMode="decimal"
              placeholder="30"
              disabled={targetType === 'check'}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
            <Input
              aria-label="Unidade da meta"
              placeholder={targetType === 'duration' ? 'min' : 'un.'}
              maxLength={20}
              disabled={targetType === 'check' || targetType === 'duration'}
              value={targetType === 'duration' ? 'min' : targetUnit}
              onChange={(e) => setTargetUnit(e.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Criando…' : 'Criar hábito'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
