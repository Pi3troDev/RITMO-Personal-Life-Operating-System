import type { ReserveProjection } from '@ritmo/shared';
import type { Db } from '../../core/db';
import { addDays, dayToDate } from '../../core/time';
import { accountBalances } from './balances';

/**
 * Para cada objetivo ligado a uma reserva: saldo, ritmo médio mensal de aportes líquidos nos últimos
 * 90 dias e a data estimada em que a meta é atingida nesse ritmo.
 */
export async function computeReserveProjections(
  db: Db,
  userId: string,
  today: string,
): Promise<ReserveProjection[]> {
  const goals = await db.goal.findMany({
    where: {
      userId,
      linkedAccountId: { not: null },
      metricTarget: { not: null },
      status: { in: ['active', 'paused'] },
    },
  });
  if (goals.length === 0) return [];

  const balances = await accountBalances(db, userId);
  const since = dayToDate(addDays(today, -90));
  const out: ReserveProjection[] = [];

  for (const goal of goals) {
    const accountId = goal.linkedAccountId!;
    const flows = await db.transaction.findMany({
      where: { userId, date: { gte: since }, OR: [{ accountId }, { toAccountId: accountId }] },
    });
    let net = 0;
    for (const t of flows) {
      if (t.type === 'transfer')
        net += t.toAccountId === accountId ? t.amountCents : -t.amountCents;
      else if (t.accountId === accountId)
        net += t.type === 'income' ? t.amountCents : -t.amountCents;
    }
    const monthlyPaceCents = Math.round(net / 3);
    const balance = balances.get(accountId) ?? 0;
    const target = Math.round(goal.metricTarget ?? 0);

    let projectedDate: string | null = null;
    if (balance >= target) projectedDate = today;
    else if (monthlyPaceCents > 0) {
      projectedDate = addDays(today, Math.ceil(((target - balance) / monthlyPaceCents) * 30));
    }
    out.push({
      goalId: goal.id,
      accountId,
      targetCents: target,
      balanceCents: balance,
      monthlyPaceCents,
      projectedDate,
    });
  }
  return out;
}
