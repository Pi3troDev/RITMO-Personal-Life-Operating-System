import {
  accountSchema,
  createAccountInputSchema,
  createFinanceCategoryInputSchema,
  createTransactionInputSchema,
  financeCategorySchema,
  financeOverviewSchema,
  idSchema,
  listTransactionsQuerySchema,
  monthSchema,
  reserveProjectionSchema,
  transactionSchema,
  updateAccountInputSchema,
  updateFinanceCategoryInputSchema,
  updateTransactionInputSchema,
  upsertBudgetInputSchema,
  type Account as AccountDto,
  type FinanceOverview,
  type Transaction as TransactionDto,
} from '@ritmo/shared';
import { z } from 'zod';
import type { Db } from '../../core/db';
import type { Deps } from '../../core/deps';
import { badRequest, conflict, notFound } from '../../core/errors';
import { route, type AnyRoute } from '../../core/http/route';
import { assertOwned, userClock } from '../../core/ownership';
import { addMonths, dateToDay, dayToDate, endOfMonth } from '../../core/time';
import type { Account, FinanceCategory, Transaction } from '../../generated/prisma/client';
import { accountBalances } from './balances';
import { computeReserveProjections } from './projections';

const toAccountDto = (a: Account, balance: number): AccountDto => ({
  id: a.id,
  name: a.name,
  kind: a.kind,
  isReserved: a.isReserved,
  initialBalanceCents: a.initialBalanceCents,
  balanceCents: balance,
  archived: a.archivedAt !== null,
});

const toCategoryDto = (c: FinanceCategory) => ({
  id: c.id,
  name: c.name,
  kind: c.kind,
  icon: c.icon,
});

const toTransactionDto = (t: Transaction): TransactionDto => ({
  id: t.id,
  type: t.type,
  description: t.description,
  amountCents: t.amountCents,
  date: dateToDay(t.date),
  categoryId: t.categoryId,
  accountId: t.accountId,
  toAccountId: t.toAccountId,
  note: t.note,
  createdAt: t.createdAt.toISOString(),
});

/** Visão geral do mês: reservado × disponível, receitas, despesas, categorias, 6 meses e orçamento. */
export async function buildFinanceOverview(
  db: Db,
  userId: string,
  month: string,
): Promise<FinanceOverview> {
  const monthStart = `${month}-01`;
  const firstChartMonth = addMonths(month, -5);
  const [accounts, balances, recent, before, budgets, categories] = await Promise.all([
    db.account.findMany({ where: { userId } }),
    accountBalances(db, userId),
    db.transaction.findMany({
      where: {
        userId,
        type: { in: ['income', 'expense'] },
        date: { gte: dayToDate(`${firstChartMonth}-01`), lte: dayToDate(endOfMonth(monthStart)) },
      },
    }),
    db.transaction.groupBy({
      by: ['type'],
      where: { userId, type: { in: ['income', 'expense'] }, date: { lt: dayToDate(monthStart) } },
      _sum: { amountCents: true },
    }),
    db.budget.findMany({ where: { userId, month } }),
    db.financeCategory.findMany({ where: { userId }, select: { id: true, name: true } }),
  ]);

  let incomeCents = 0;
  let expenseCents = 0;
  const byCategory = new Map<string | null, number>();
  const monthly = new Map<string, { incomeCents: number; expenseCents: number }>();
  for (let i = 0; i < 6; i++)
    monthly.set(addMonths(firstChartMonth, i), { incomeCents: 0, expenseCents: 0 });

  for (const t of recent) {
    const m = dateToDay(t.date).slice(0, 7);
    const bucket = monthly.get(m);
    if (bucket) {
      if (t.type === 'income') bucket.incomeCents += t.amountCents;
      else bucket.expenseCents += t.amountCents;
    }
    if (m !== month) continue;
    if (t.type === 'income') incomeCents += t.amountCents;
    else {
      expenseCents += t.amountCents;
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + t.amountCents);
    }
  }

  let openingBalanceCents = accounts.reduce((sum, a) => sum + a.initialBalanceCents, 0);
  for (const row of before) {
    openingBalanceCents +=
      row.type === 'income' ? (row._sum.amountCents ?? 0) : -(row._sum.amountCents ?? 0);
  }

  const sum = (reserved: boolean) =>
    accounts
      .filter((a) => a.isReserved === reserved)
      .reduce((acc, a) => acc + (balances.get(a.id) ?? 0), 0);
  const nameOf = new Map(categories.map((c) => [c.id, c.name] as const));

  return {
    month,
    openingBalanceCents,
    incomeCents,
    expenseCents,
    reservedCents: sum(true),
    availableCents: sum(false),
    expensesByCategory: [...byCategory.entries()]
      .map(([categoryId, amountCents]) => ({
        categoryId,
        name: categoryId ? (nameOf.get(categoryId) ?? 'Sem categoria') : 'Sem categoria',
        amountCents,
      }))
      .sort((a, b) => b.amountCents - a.amountCents),
    monthly: [...monthly.entries()].map(([m, v]) => ({ month: m, ...v })),
    budgets: budgets.map((b) => ({
      categoryId: b.categoryId,
      month: b.month,
      limitCents: b.limitCents,
      spentCents: byCategory.get(b.categoryId) ?? 0,
    })),
  };
}

export function financeRoutes({ db }: Deps): AnyRoute[] {
  const idParams = z.object({ id: idSchema });

  /** Confere contas e categoria de uma movimentação: tudo do mesmo usuário e coerente com o tipo. */
  async function validateTransaction(
    userId: string,
    t: { type: string; accountId: string; toAccountId?: string | null; categoryId?: string | null },
  ) {
    await assertOwned(db, 'account', userId, t.accountId);
    if (t.type === 'transfer') {
      if (!t.toAccountId) throw badRequest('Escolha a conta de destino');
      if (t.toAccountId === t.accountId)
        throw badRequest('Origem e destino precisam ser contas diferentes');
      await assertOwned(db, 'account', userId, t.toAccountId);
      return;
    }
    if (t.categoryId) {
      const category = await db.financeCategory.findFirst({ where: { id: t.categoryId, userId } });
      if (!category) throw badRequest('Categoria inválida.');
      if (category.kind !== t.type)
        throw badRequest('A categoria não combina com o tipo da movimentação.');
    }
  }

  async function accountDto(userId: string, id: string) {
    const account = await db.account.findFirst({ where: { id, userId } });
    if (!account) throw notFound();
    return toAccountDto(account, (await accountBalances(db, userId)).get(id) ?? 0);
  }

  return [
    // ---- visão geral -----------------------------------------------------------------------
    route({
      method: 'get',
      path: '/finance/overview',
      tag: 'Finanças',
      summary: 'Visão geral do mês',
      description:
        'Saldo reservado × disponível, receitas e despesas do mês (transferências entre contas próprias ficam de fora), ' +
        'despesas por categoria, últimos 6 meses e orçamento planejado × realizado.',
      query: z.object({ month: monthSchema.optional() }),
      response: financeOverviewSchema,
      async handler({ userId, query }) {
        const user = await userClock(db, userId);
        return buildFinanceOverview(db, userId, query.month ?? user.today.slice(0, 7));
      },
    }),

    route({
      method: 'get',
      path: '/finance/projections',
      tag: 'Finanças',
      summary: 'Projeção das reservas dos objetivos',
      description:
        'Para cada objetivo ligado a uma conta-reserva: saldo, ritmo médio mensal de aportes (últimos 90 dias) e a ' +
        'data estimada de conclusão. Sem ritmo positivo, não há projeção (`projectedDate: null`).',
      response: z.array(reserveProjectionSchema),
      async handler({ userId }) {
        const user = await userClock(db, userId);
        return computeReserveProjections(db, userId, user.today);
      },
    }),

    // ---- contas ----------------------------------------------------------------------------
    route({
      method: 'get',
      path: '/finance/accounts',
      tag: 'Finanças',
      summary: 'Listar contas e reservas',
      description:
        'Com o saldo atual calculado. Contas arquivadas só aparecem com `includeArchived`.',
      query: z.object({ includeArchived: z.stringbool().optional() }),
      response: z.array(accountSchema),
      async handler({ userId, query }) {
        const [accounts, balances] = await Promise.all([
          db.account.findMany({
            where: { userId, ...(query.includeArchived ? {} : { archivedAt: null }) },
            orderBy: { createdAt: 'asc' },
          }),
          accountBalances(db, userId),
        ]);
        return accounts.map((a) => toAccountDto(a, balances.get(a.id) ?? 0));
      },
    }),

    route({
      method: 'post',
      path: '/finance/accounts',
      tag: 'Finanças',
      summary: 'Criar conta ou reserva',
      description:
        '`isReserved` separa o dinheiro guardado para um propósito do que está disponível para gastar.',
      body: createAccountInputSchema,
      response: accountSchema,
      async handler({ userId, body }) {
        if (await db.account.findUnique({ where: { userId_name: { userId, name: body.name } } })) {
          throw conflict('Você já tem uma conta com este nome.');
        }
        const account = await db.account.create({
          data: {
            userId,
            name: body.name,
            kind: body.kind,
            isReserved: body.isReserved ?? body.kind === 'reserve',
            initialBalanceCents: body.initialBalanceCents ?? 0,
          },
        });
        return toAccountDto(account, account.initialBalanceCents);
      },
    }),

    route({
      method: 'patch',
      path: '/finance/accounts/:id',
      tag: 'Finanças',
      summary: 'Editar ou arquivar conta',
      params: idParams,
      body: updateAccountInputSchema,
      response: accountSchema,
      async handler({ userId, params, body }) {
        const current = await db.account.findFirst({ where: { id: params.id, userId } });
        if (!current) throw notFound();
        if (body.name && body.name !== current.name) {
          if (
            await db.account.findUnique({ where: { userId_name: { userId, name: body.name } } })
          ) {
            throw conflict('Você já tem uma conta com este nome.');
          }
        }
        const { archived, ...rest } = body;
        await db.account.update({
          where: { id: current.id },
          data: {
            ...rest,
            ...(archived === undefined ? {} : { archivedAt: archived ? new Date() : null }),
          },
        });
        return accountDto(userId, current.id);
      },
    }),

    route({
      method: 'delete',
      path: '/finance/accounts/:id',
      tag: 'Finanças',
      summary: 'Excluir conta',
      description: 'Só é possível se a conta não tiver movimentações; caso contrário, arquive-a.',
      params: idParams,
      async handler({ userId, params }) {
        const account = await db.account.findFirst({ where: { id: params.id, userId } });
        if (!account) throw notFound();
        const used = await db.transaction.count({
          where: { userId, OR: [{ accountId: account.id }, { toAccountId: account.id }] },
        });
        if (used > 0) throw conflict('A conta tem movimentações. Arquive-a em vez de excluir.');
        await db.account.delete({ where: { id: account.id } });
      },
    }),

    // ---- categorias ------------------------------------------------------------------------
    route({
      method: 'get',
      path: '/finance/categories',
      tag: 'Finanças',
      summary: 'Listar categorias',
      response: z.array(financeCategorySchema),
      async handler({ userId }) {
        const categories = await db.financeCategory.findMany({
          where: { userId, archivedAt: null },
          orderBy: [{ kind: 'desc' }, { name: 'asc' }],
        });
        return categories.map(toCategoryDto);
      },
    }),

    route({
      method: 'post',
      path: '/finance/categories',
      tag: 'Finanças',
      summary: 'Criar categoria',
      body: createFinanceCategoryInputSchema,
      response: financeCategorySchema,
      async handler({ userId, body }) {
        if (
          await db.financeCategory.findUnique({
            where: { userId_kind_name: { userId, kind: body.kind, name: body.name } },
          })
        ) {
          throw conflict('Já existe uma categoria com este nome.');
        }
        const category = await db.financeCategory.create({
          data: { userId, name: body.name, kind: body.kind, icon: body.icon ?? 'tag' },
        });
        return toCategoryDto(category);
      },
    }),

    route({
      method: 'patch',
      path: '/finance/categories/:id',
      tag: 'Finanças',
      summary: 'Editar categoria',
      params: idParams,
      body: updateFinanceCategoryInputSchema,
      response: financeCategorySchema,
      async handler({ userId, params, body }) {
        const current = await db.financeCategory.findFirst({ where: { id: params.id, userId } });
        if (!current) throw notFound();
        if (body.name && body.name !== current.name) {
          if (
            await db.financeCategory.findUnique({
              where: { userId_kind_name: { userId, kind: current.kind, name: body.name } },
            })
          ) {
            throw conflict('Já existe uma categoria com este nome.');
          }
        }
        return toCategoryDto(
          await db.financeCategory.update({ where: { id: current.id }, data: body }),
        );
      },
    }),

    route({
      method: 'delete',
      path: '/finance/categories/:id',
      tag: 'Finanças',
      summary: 'Excluir categoria',
      description:
        'As movimentações da categoria ficam "sem categoria"; os orçamentos dela são removidos.',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.financeCategory.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    // ---- movimentações ---------------------------------------------------------------------
    route({
      method: 'get',
      path: '/finance/transactions',
      tag: 'Finanças',
      summary: 'Listar movimentações',
      description:
        'Da mais recente para a mais antiga. Filtros opcionais: mês, conta, categoria, tipo.',
      query: listTransactionsQuerySchema,
      response: z.array(transactionSchema),
      async handler({ userId, query }) {
        const rows = await db.transaction.findMany({
          where: {
            userId,
            ...(query.month
              ? {
                  date: {
                    gte: dayToDate(`${query.month}-01`),
                    lte: dayToDate(endOfMonth(`${query.month}-01`)),
                  },
                }
              : {}),
            ...(query.accountId
              ? { OR: [{ accountId: query.accountId }, { toAccountId: query.accountId }] }
              : {}),
            ...(query.categoryId ? { categoryId: query.categoryId } : {}),
            ...(query.type ? { type: query.type } : {}),
          },
          orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
        return rows.map(toTransactionDto);
      },
    }),

    route({
      method: 'post',
      path: '/finance/transactions',
      tag: 'Finanças',
      summary: 'Registrar movimentação',
      description:
        '`income` e `expense` movem uma conta. `transfer` leva dinheiro de `accountId` para `toAccountId` (contas do próprio ' +
        'usuário) e **nunca** conta como receita ou despesa: para uma conta reservada é um aporte; saindo dela, um resgate.',
      body: createTransactionInputSchema,
      response: transactionSchema,
      async handler({ userId, body }) {
        await validateTransaction(userId, body);
        const t = await db.transaction.create({
          data: {
            userId,
            type: body.type,
            description: body.description,
            amountCents: body.amountCents,
            date: dayToDate(body.date),
            accountId: body.accountId,
            toAccountId: body.type === 'transfer' ? (body.toAccountId ?? null) : null,
            categoryId: body.type === 'transfer' ? null : (body.categoryId ?? null),
            note: body.note ?? null,
          },
        });
        return toTransactionDto(t);
      },
    }),

    route({
      method: 'patch',
      path: '/finance/transactions/:id',
      tag: 'Finanças',
      summary: 'Corrigir movimentação',
      description: 'O tipo não muda; para isso, exclua e crie outra.',
      params: idParams,
      body: updateTransactionInputSchema,
      response: transactionSchema,
      async handler({ userId, params, body }) {
        const current = await db.transaction.findFirst({ where: { id: params.id, userId } });
        if (!current) throw notFound();
        const merged = {
          type: current.type,
          accountId: body.accountId ?? current.accountId,
          toAccountId: body.toAccountId !== undefined ? body.toAccountId : current.toAccountId,
          categoryId: body.categoryId !== undefined ? body.categoryId : current.categoryId,
        };
        await validateTransaction(userId, merged);
        const { date, ...rest } = body;
        const t = await db.transaction.update({
          where: { id: current.id },
          data: {
            ...rest,
            ...(date ? { date: dayToDate(date) } : {}),
            toAccountId: current.type === 'transfer' ? merged.toAccountId : null,
            categoryId: current.type === 'transfer' ? null : merged.categoryId,
          },
        });
        return toTransactionDto(t);
      },
    }),

    route({
      method: 'delete',
      path: '/finance/transactions/:id',
      tag: 'Finanças',
      summary: 'Excluir movimentação',
      params: idParams,
      async handler({ userId, params }) {
        const { count } = await db.transaction.deleteMany({ where: { id: params.id, userId } });
        if (count === 0) throw notFound();
      },
    }),

    // ---- orçamento -------------------------------------------------------------------------
    route({
      method: 'put',
      path: '/finance/budgets',
      tag: 'Finanças',
      summary: 'Definir o orçamento de uma categoria no mês',
      description: 'Devolve a visão geral do mês já atualizada.',
      body: upsertBudgetInputSchema,
      response: financeOverviewSchema,
      async handler({ userId, body }) {
        const category = await db.financeCategory.findFirst({
          where: { id: body.categoryId, userId },
        });
        if (!category) throw badRequest('Categoria inválida.');
        if (category.kind !== 'expense')
          throw badRequest('Só categorias de despesa têm orçamento.');
        await db.budget.upsert({
          where: {
            userId_categoryId_month: { userId, categoryId: body.categoryId, month: body.month },
          },
          create: {
            userId,
            categoryId: body.categoryId,
            month: body.month,
            limitCents: body.limitCents,
          },
          update: { limitCents: body.limitCents },
        });
        return buildFinanceOverview(db, userId, body.month);
      },
    }),

    route({
      method: 'delete',
      path: '/finance/budgets',
      tag: 'Finanças',
      summary: 'Remover o orçamento de uma categoria no mês',
      query: z.object({ categoryId: idSchema, month: monthSchema }),
      async handler({ userId, query }) {
        await db.budget.deleteMany({
          where: { userId, categoryId: query.categoryId, month: query.month },
        });
      },
    }),
  ];
}
