import {
  createGoalInputSchema,
  GOAL_CATEGORIES,
  GOAL_CATEGORY_LABELS,
  type GoalCategory,
} from '@ritmo/shared';
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
import { Textarea } from '@/components/ui/textarea';
import { useAccounts } from '@/features/finance/api';
import { parseCurrencyToCents } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { useCreateGoal } from './api';

const NO_RESERVE = '__none__';
type Mode = 'manual' | 'milestones' | 'metric';
type MetricKind = 'money' | 'hours' | 'count';

const MODES: Record<Mode, string> = {
  manual: 'Eu informo o progresso',
  milestones: 'Por marcos (etapas)',
  metric: 'Por uma meta numérica',
};
const METRICS: Record<MetricKind, string> = {
  money: 'Dinheiro (R$)',
  hours: 'Horas dedicadas',
  count: 'Contagem (ex.: livros)',
};

export function NewGoalDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<GoalCategory>('personal');
  const [targetDate, setTargetDate] = useState('');
  const [mode, setMode] = useState<Mode>('manual');
  const [milestones, setMilestones] = useState('');
  const [metricKind, setMetricKind] = useState<MetricKind>('money');
  const [metricTarget, setMetricTarget] = useState('');
  const [metricUnit, setMetricUnit] = useState('');
  const [reserveId, setReserveId] = useState(NO_RESERVE);
  const [error, setError] = useState<string | null>(null);
  const { data: accounts } = useAccounts();
  const create = useCreateGoal();

  const reserves = accounts?.filter((a) => a.isReserved) ?? [];

  function close(next: boolean) {
    if (!next) {
      setName('');
      setCategory('personal');
      setTargetDate('');
      setMode('manual');
      setMilestones('');
      setMetricKind('money');
      setMetricTarget('');
      setMetricUnit('');
      setReserveId(NO_RESERVE);
      setError(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();

    let metric: { kind: MetricKind; target: number; unit: string } | null = null;
    if (mode === 'metric') {
      const target =
        metricKind === 'money'
          ? parseCurrencyToCents(metricTarget)
          : Number(metricTarget.replace(',', '.'));
      if (target === null || !Number.isFinite(target) || target <= 0) {
        setError('Informe uma meta maior que zero');
        return;
      }
      metric = {
        kind: metricKind,
        target,
        unit:
          metricKind === 'money' ? 'R$' : metricKind === 'hours' ? 'h' : metricUnit.trim() || 'un.',
      };
    }

    const parsed = createGoalInputSchema.safeParse({
      name,
      category,
      targetDate: targetDate || null,
      progressMode: mode,
      metric,
      linkedAccountId:
        mode === 'metric' && metricKind === 'money' && reserveId !== NO_RESERVE ? reserveId : null,
      milestones: milestones
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((title) => ({ title })),
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('Objetivo criado');
        close(false);
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo objetivo</DialogTitle>
          <DialogDescription>
            Algo que você quer construir. Depois você liga hábitos, tarefas e, se fizer sentido,
            dinheiro.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">Nome</Label>
            <Input
              id="goal-name"
              autoFocus
              value={name}
              maxLength={120}
              aria-invalid={!!error}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as GoalCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {GOAL_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="goal-date">Data-alvo</Label>
              <Input
                id="goal-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Como medir o progresso</Label>
            <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODES).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === 'metric' ? (
            <div className="space-y-3 rounded-lg border p-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Tipo de meta</Label>
                  <Select value={metricKind} onValueChange={(v) => setMetricKind(v as MetricKind)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(METRICS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="goal-target">Valor da meta</Label>
                  <Input
                    id="goal-target"
                    inputMode="decimal"
                    placeholder={metricKind === 'money' ? '10.000,00' : '100'}
                    value={metricTarget}
                    onChange={(e) => setMetricTarget(e.target.value)}
                  />
                </div>
              </div>
              {metricKind === 'count' ? (
                <div className="space-y-1.5">
                  <Label htmlFor="goal-unit">Unidade</Label>
                  <Input
                    id="goal-unit"
                    placeholder="livros"
                    maxLength={20}
                    value={metricUnit}
                    onChange={(e) => setMetricUnit(e.target.value)}
                  />
                </div>
              ) : null}
              {metricKind === 'money' ? (
                <div className="space-y-1.5">
                  <Label>Reserva que acompanha este objetivo</Label>
                  <Select value={reserveId} onValueChange={setReserveId}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_RESERVE}>Nenhuma (informo à mão)</SelectItem>
                      {reserves.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {reserves.length === 0
                      ? 'Crie uma conta do tipo reserva em Finanças para acompanhar o saldo automaticamente.'
                      : 'O progresso passa a ser o saldo da reserva.'}
                  </p>
                </div>
              ) : null}
              {metricKind === 'hours' ? (
                <p className="text-xs text-muted-foreground">
                  O progresso soma o tempo registrado neste objetivo.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="goal-milestones">Marcos (um por linha, opcional)</Label>
              <Textarea
                id="goal-milestones"
                rows={3}
                value={milestones}
                placeholder={'Concluir o módulo 1\nFazer a prova'}
                onChange={(e) => setMilestones(e.target.value)}
              />
            </div>
          )}

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
              {create.isPending ? 'Criando…' : 'Criar objetivo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
