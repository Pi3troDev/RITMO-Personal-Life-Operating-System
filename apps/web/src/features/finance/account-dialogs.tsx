import {
  ACCOUNT_KIND_LABELS,
  createAccountInputSchema,
  type AccountKind,
  type FinanceCategory,
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
import { parseCurrencyToCents } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { useCreateAccount, useUpsertBudget } from './api';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewAccountDialog({ open, onOpenChange }: DialogProps) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<AccountKind>('checking');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState<string | null>(null);
  const create = useCreateAccount();

  function close(next: boolean) {
    if (!next) {
      setName('');
      setKind('checking');
      setBalance('');
      setError(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const initial = balance.trim() === '' ? 0 : parseCurrencyToCents(balance);
    if (initial === null) {
      setError('Informe um saldo válido');
      return;
    }
    const parsed = createAccountInputSchema.safeParse({
      name,
      kind,
      isReserved: kind === 'reserve',
      initialBalanceCents: initial,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: () => {
        toast.success(kind === 'reserve' ? 'Reserva criada' : 'Conta criada');
        close(false);
      },
      onError: (e) => toast.error(errorMessage(e)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Nova conta ou reserva</DialogTitle>
          <DialogDescription>
            Reservas guardam dinheiro para um propósito e não entram no disponível para gastar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="account-name">Nome</Label>
            <Input
              id="account-name"
              autoFocus
              value={name}
              maxLength={60}
              aria-invalid={!!error}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as AccountKind)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_KIND_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="account-balance">Saldo atual</Label>
              <Input
                id="account-balance"
                inputMode="decimal"
                placeholder="0,00"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
              />
            </div>
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
              {create.isPending ? 'Criando…' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function BudgetDialog({
  open,
  onOpenChange,
  month,
  categories,
}: DialogProps & { month: string; categories: FinanceCategory[] }) {
  const expenseCategories = categories.filter((c) => c.kind === 'expense');
  const [categoryId, setCategoryId] = useState('');
  const [limit, setLimit] = useState('');
  const [error, setError] = useState<string | null>(null);
  const save = useUpsertBudget();

  function close(next: boolean) {
    if (!next) {
      setCategoryId('');
      setLimit('');
      setError(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cents = parseCurrencyToCents(limit);
    if (!categoryId) return setError('Escolha uma categoria');
    if (cents === null || cents < 0) return setError('Informe um limite válido');
    save.mutate(
      { categoryId, month, limitCents: cents },
      {
        onSuccess: () => {
          toast.success('Orçamento salvo');
          close(false);
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Limite do mês</DialogTitle>
          <DialogDescription>
            Quanto você quer gastar, no máximo, em uma categoria neste mês.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setError(null);
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Escolha" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="budget-limit">Limite</Label>
            <Input
              id="budget-limit"
              inputMode="decimal"
              placeholder="500,00"
              value={limit}
              onChange={(e) => {
                setLimit(e.target.value);
                setError(null);
              }}
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
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
