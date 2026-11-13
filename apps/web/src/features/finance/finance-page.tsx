import type { Account, FinanceOverview, Transaction } from '@ritmo/shared';
import { addMonths, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeftRight, ChevronLeft, ChevronRight, Lock, Plus, Receipt } from 'lucide-react';
import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { ProgressBar } from '@/components/shared/progress';
import { EmptyState, ErrorState, RowsSkeleton } from '@/components/shared/states';
import { Button } from '@/components/ui/button';
import { formatMonth, formatShortDate, toMonthKey, fromDateKey } from '@/lib/dates';
import { formatCurrency, formatCurrencyCompact } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useAccounts, useFinanceCategories, useFinanceOverview, useTransactions } from './api';
import { TransactionDialog } from './transaction-dialog';

function Figure({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'positive' | 'negative' }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 truncate text-2xl font-semibold tabular', tone === 'positive' && 'text-success', tone === 'negative' && 'text-foreground')}>
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function MonthlyChart({ overview }: { overview: FinanceOverview }) {
  const data = overview.monthly.map((m) => ({
    name: format(parseISO(`${m.month}-01`), 'MMM', { locale: ptBR }).replace('.', ''),
    Receitas: m.incomeCents,
    Despesas: m.expenseCents,
  }));
  return (
    <section aria-labelledby="chart-title" className="surface p-5">
      <h2 id="chart-title" className="text-sm font-semibold">Receitas e despesas</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">Últimos 6 meses. Transferências entre contas ficam de fora.</p>
      <div className="mt-4 h-56" role="img" aria-label="Gráfico de receitas e despesas dos últimos seis meses">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }} />
            <YAxis tickLine={false} axisLine={false} width={56} tickFormatter={(v: number) => formatCurrencyCompact(v)} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
            <Tooltip
              cursor={{ fill: 'var(--muted)', opacity: 0.4 }}
              formatter={(v) => formatCurrency(Number(v))}
              contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--popover-foreground)', fontSize: 12 }}
            />
            <Bar dataKey="Receitas" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="Despesas" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-1" /> Receitas</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-chart-2" /> Despesas</span>
      </div>
    </section>
  );
}

function Budgets({ overview }: { overview: FinanceOverview }) {
  const { data: categories } = useFinanceCategories();
  if (overview.budgets.length === 0) {
    return (
      <section className="surface p-5">
        <h2 className="text-sm font-semibold">Orçamento do mês</h2>
        <p className="mt-2 text-sm text-muted-foreground">Nenhum limite definido para este mês.</p>
      </section>
    );
  }
  return (
    <section aria-labelledby="budget-title" className="surface p-5">
      <h2 id="budget-title" className="text-sm font-semibold">Orçamento do mês</h2>
      <ul className="mt-4 space-y-4">
        {overview.budgets.map((b) => {
          const name = categories?.find((c) => c.id === b.categoryId)?.name ?? 'Categoria';
          const over = b.spentCents > b.limitCents;
          return (
            <li key={b.categoryId}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{name}</span>
                <span className="text-xs text-muted-foreground tabular">
                  <span className={cn('font-medium', over ? 'text-warning' : 'text-foreground')}>{formatCurrency(b.spentCents)}</span>
                  {' '}de {formatCurrency(b.limitCents)}
                </span>
              </div>
              <ProgressBar value={b.limitCents === 0 ? 0 : (b.spentCents / b.limitCents) * 100} className="mt-1.5" color={over ? 'var(--warning)' : undefined} label={`Orçamento de ${name}`} />
              <p className="mt-1 text-xs text-muted-foreground tabular">
                {over ? `${formatCurrency(b.spentCents - b.limitCents)} acima do limite` : `Disponível: ${formatCurrency(b.limitCents - b.spentCents)}`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Accounts({ accounts }: { accounts: Account[] }) {
  return (
    <section aria-labelledby="accounts-title" className="surface p-5">
      <h2 id="accounts-title" className="text-sm font-semibold">Contas e reservas</h2>
      <ul className="mt-3 divide-y divide-border/50">
        {accounts.map((a) => (
          <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              {a.isReserved ? <Lock className="size-3.5 shrink-0 text-muted-foreground" aria-label="Reservado" /> : null}
              <span className="truncate">{a.name}</span>
            </span>
            <span className="font-medium tabular">{formatCurrency(a.balanceCents)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TransactionRow({ tx, accounts, categoryName }: { tx: Transaction; accounts: Account[]; categoryName: string | undefined }) {
  const nameOf = (id: string | null) => accounts.find((a) => a.id === id)?.name ?? '—';
  const isTransfer = tx.type === 'transfer';
  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground')}>
        {isTransfer ? <ArrowLeftRight className="size-4" aria-hidden /> : <Receipt className="size-4" aria-hidden />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{tx.description}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatShortDate(fromDateKey(tx.date))} · {isTransfer ? `${nameOf(tx.accountId)} → ${nameOf(tx.toAccountId)}` : (categoryName ?? 'Sem categoria')}
        </p>
      </div>
      <span className={cn('shrink-0 text-sm font-medium tabular', tx.type === 'income' && 'text-success', isTransfer && 'text-muted-foreground')}>
        {tx.type === 'expense' ? '−' : tx.type === 'income' ? '+' : ''}
        {formatCurrency(tx.amountCents)}
      </span>
    </li>
  );
}

export function FinancePage() {
  const [month, setMonth] = useState(() => toMonthKey(new Date()));
  const [creating, setCreating] = useState(false);
  const overview = useFinanceOverview(month);
  const accounts = useAccounts();
  const transactions = useTransactions(month);
  const categories = useFinanceCategories();
  const monthDate = parseISO(`${month}-01`);
  const isCurrent = month === toMonthKey(new Date());

  const net = overview.data ? overview.data.incomeCents - overview.data.expenseCents : 0;

  return (
    <>
      <PageHeader
        title="Finanças"
        description="Tudo informado manualmente. Dinheiro reservado fica separado do disponível."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden /> Novo lançamento
          </Button>
        }
      />

      <div className="mb-5 flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => setMonth(toMonthKey(addMonths(monthDate, -1)))} aria-label="Mês anterior">
          <ChevronLeft />
        </Button>
        <span className="inline-block min-w-36 text-center text-sm font-medium first-letter:uppercase">
          {formatMonth(monthDate)}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setMonth(toMonthKey(addMonths(monthDate, 1)))} disabled={isCurrent} aria-label="Próximo mês">
          <ChevronRight />
        </Button>
      </div>

      {overview.isPending ? <RowsSkeleton rows={4} /> : null}
      {overview.isError ? <ErrorState error={overview.error} onRetry={() => void overview.refetch()} /> : null}

      {overview.data ? (
        <div className="space-y-6">
          <section aria-label="Resumo do mês" className="grid grid-cols-2 gap-x-6 gap-y-5 surface p-5 lg:grid-cols-4">
            <Figure label="Disponível para gastar" value={formatCurrency(overview.data.availableCents)} />
            <Figure label="Reservado" value={formatCurrency(overview.data.reservedCents)} hint="Separado do disponível" />
            <Figure label="Receitas do mês" value={formatCurrency(overview.data.incomeCents)} tone="positive" />
            <Figure label="Despesas do mês" value={formatCurrency(overview.data.expenseCents)} hint={`Saldo do mês: ${net >= 0 ? '+' : '−'}${formatCurrency(Math.abs(net))}`} />
          </section>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="space-y-6">
              <MonthlyChart overview={overview.data} />
              <section aria-labelledby="tx-title" className="surface p-5">
                <h2 id="tx-title" className="text-sm font-semibold">Movimentações</h2>
                {transactions.isPending ? <div className="mt-3"><RowsSkeleton rows={3} /></div> : null}
                {transactions.isError ? <div className="mt-3"><ErrorState error={transactions.error} onRetry={() => void transactions.refetch()} /></div> : null}
                {transactions.data && accounts.data ? (
                  transactions.data.length === 0 ? (
                    <EmptyState icon={Receipt} title="Nenhuma movimentação neste mês" className="mt-3 border-0 py-8" />
                  ) : (
                    <ul className="mt-2 divide-y divide-border/50">
                      {transactions.data.map((tx) => (
                        <TransactionRow key={tx.id} tx={tx} accounts={accounts.data} categoryName={categories.data?.find((c) => c.id === tx.categoryId)?.name} />
                      ))}
                    </ul>
                  )
                ) : null}
              </section>
            </div>
            <aside className="space-y-6">
              {accounts.data ? <Accounts accounts={accounts.data} /> : null}
              <Budgets overview={overview.data} />
            </aside>
          </div>
        </div>
      ) : null}

      <TransactionDialog open={creating} onOpenChange={setCreating} />
    </>
  );
}
