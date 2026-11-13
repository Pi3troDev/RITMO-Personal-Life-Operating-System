import { createTransactionInputSchema, type TransactionType } from '@ritmo/shared';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { todayKey } from '@/lib/dates';
import { parseCurrencyToCents } from '@/lib/format';
import { errorMessage } from '@/lib/http';
import { useAccounts, useCreateTransaction, useFinanceCategories } from './api';

const NO_CATEGORY = '__none__';
const TYPE_LABEL: Record<TransactionType, string> = { expense: 'Despesa', income: 'Receita', transfer: 'Transferência' };

export function TransactionDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [type, setType] = useState<TransactionType>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayKey());
  const [categoryId, setCategoryId] = useState(NO_CATEGORY);
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { data: accounts } = useAccounts();
  const { data: categories } = useFinanceCategories();
  const create = useCreateTransaction();

  const effectiveAccount = accountId || accounts?.find((a) => !a.isReserved)?.id || '';

  function close(next: boolean) {
    if (!next) {
      setDescription('');
      setAmount('');
      setDate(todayKey());
      setCategoryId(NO_CATEGORY);
      setToAccountId('');
      setError(null);
    }
    onOpenChange(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const cents = parseCurrencyToCents(amount);
    if (cents === null || cents <= 0) {
      setError('Informe um valor maior que zero');
      return;
    }
    const parsed = createTransactionInputSchema.safeParse({
      type,
      description,
      amountCents: cents,
      date,
      accountId: effectiveAccount,
      toAccountId: type === 'transfer' ? toAccountId || null : null,
      categoryId: type === 'transfer' || categoryId === NO_CATEGORY ? null : categoryId,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Dados inválidos');
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: () => {
        toast.success(type === 'transfer' ? 'Transferência registrada' : 'Lançamento registrado');
        close(false);
      },
      onError: (e) => setError(errorMessage(e)),
    });
  }

  const relevantCategories = categories?.filter((c) => c.kind === (type === 'income' ? 'income' : 'expense')) ?? [];

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Novo lançamento</DialogTitle>
          <DialogDescription>
            {type === 'transfer'
              ? 'Mover dinheiro entre suas contas não conta como receita nem despesa.'
              : 'Registre a movimentação manualmente.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <Tabs value={type} onValueChange={(v) => { setType(v as TransactionType); setCategoryId(NO_CATEGORY); setError(null); }}>
            <TabsList className="w-full">
              {(Object.keys(TYPE_LABEL) as TransactionType[]).map((t) => (
                <TabsTrigger key={t} value={t} className="flex-1">{TYPE_LABEL[t]}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="space-y-1.5">
            <Label htmlFor="tx-desc">Descrição</Label>
            <Input id="tx-desc" autoFocus value={description} maxLength={120} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tx-amount">Valor (R$)</Label>
              <Input id="tx-amount" inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tx-date">Data</Label>
              <Input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{type === 'transfer' ? 'Origem' : 'Conta'}</Label>
              <Select value={effectiveAccount} onValueChange={setAccountId}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Escolha" /></SelectTrigger>
                <SelectContent>{accounts?.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {type === 'transfer' ? (
              <div className="space-y-1.5">
                <Label>Destino</Label>
                <Select value={toAccountId} onValueChange={setToAccountId}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Escolha" /></SelectTrigger>
                  <SelectContent>{accounts?.filter((a) => a.id !== effectiveAccount).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>Sem categoria</SelectItem>
                    {relevantCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => close(false)}>Cancelar</Button>
            <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Salvando…' : 'Registrar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
