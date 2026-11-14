import type { Db } from '../../core/db';

/**
 * Saldo de cada conta = saldo inicial + receitas − despesas − transferências enviadas + transferências recebidas.
 * Transferência entre contas do próprio usuário nunca é receita nem despesa.
 */
export async function accountBalances(db: Db, userId: string): Promise<Map<string, number>> {
  const [accounts, bySource, byDestination] = await Promise.all([
    db.account.findMany({ where: { userId }, select: { id: true, initialBalanceCents: true } }),
    db.transaction.groupBy({
      by: ['accountId', 'type'],
      where: { userId },
      _sum: { amountCents: true },
    }),
    db.transaction.groupBy({
      by: ['toAccountId'],
      where: { userId, type: 'transfer', toAccountId: { not: null } },
      _sum: { amountCents: true },
    }),
  ]);

  const balances = new Map(accounts.map((a) => [a.id, a.initialBalanceCents] as const));
  for (const row of bySource) {
    const amount = row._sum.amountCents ?? 0;
    const current = balances.get(row.accountId) ?? 0;
    balances.set(row.accountId, row.type === 'income' ? current + amount : current - amount);
  }
  for (const row of byDestination) {
    if (!row.toAccountId) continue;
    balances.set(
      row.toAccountId,
      (balances.get(row.toAccountId) ?? 0) + (row._sum.amountCents ?? 0),
    );
  }
  return balances;
}
