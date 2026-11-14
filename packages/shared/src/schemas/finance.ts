import { z } from 'zod';
import { centsSchema, dateSchema, dateTimeSchema, idSchema, monthSchema } from './common';

export const accountKindSchema = z.enum(['checking', 'cash', 'reserve', 'investment']);
export type AccountKind = z.infer<typeof accountKindSchema>;

export const ACCOUNT_KIND_LABELS: Record<AccountKind, string> = {
  checking: 'Conta corrente',
  cash: 'Dinheiro',
  reserve: 'Reserva',
  investment: 'Investimento',
};

export const accountSchema = z.object({
  id: idSchema,
  name: z.string(),
  kind: accountKindSchema,
  /** Reserved money is set aside for a purpose and is not available for spending. */
  isReserved: z.boolean(),
  initialBalanceCents: centsSchema,
  /** Computed: initial balance plus every movement. */
  balanceCents: centsSchema,
  archived: z.boolean(),
});
export type Account = z.infer<typeof accountSchema>;

export const createAccountInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome à conta').max(60),
  kind: accountKindSchema,
  isReserved: z.boolean().optional(),
  initialBalanceCents: centsSchema.optional(),
});
export type CreateAccountInput = z.infer<typeof createAccountInputSchema>;

export const financeCategorySchema = z.object({
  id: idSchema,
  name: z.string(),
  kind: z.enum(['income', 'expense']),
  icon: z.string(),
});
export type FinanceCategory = z.infer<typeof financeCategorySchema>;

/**
 * `transfer` moves money between the user's own accounts (`accountId` → `toAccountId`).
 * It is never income nor expense. A transfer into a reserved account is a contribution
 * ("aporte"); out of one, a withdrawal ("resgate").
 */
export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const transactionSchema = z.object({
  id: idSchema,
  type: transactionTypeSchema,
  description: z.string(),
  /** Always positive; the type gives the direction. */
  amountCents: centsSchema.positive(),
  date: dateSchema,
  categoryId: idSchema.nullable(),
  accountId: idSchema,
  toAccountId: idSchema.nullable(),
  note: z.string().nullable(),
  createdAt: dateTimeSchema,
});
export type Transaction = z.infer<typeof transactionSchema>;

export const createTransactionInputSchema = z
  .object({
    type: transactionTypeSchema,
    description: z.string().trim().min(1, 'Descreva a movimentação').max(120),
    amountCents: centsSchema.positive('Informe um valor maior que zero'),
    date: dateSchema,
    categoryId: idSchema.nullish(),
    accountId: idSchema,
    toAccountId: idSchema.nullish(),
    note: z.string().max(500).nullish(),
  })
  .refine((v) => v.type !== 'transfer' || !!v.toAccountId, {
    message: 'Escolha a conta de destino',
    path: ['toAccountId'],
  })
  .refine((v) => v.type !== 'transfer' || v.toAccountId !== v.accountId, {
    message: 'Origem e destino precisam ser contas diferentes',
    path: ['toAccountId'],
  });
export type CreateTransactionInput = z.infer<typeof createTransactionInputSchema>;

export const budgetSchema = z.object({
  categoryId: idSchema,
  month: monthSchema,
  limitCents: centsSchema.nonnegative(),
  /** Computed from the month's expenses in the category. */
  spentCents: centsSchema.nonnegative(),
});
export type Budget = z.infer<typeof budgetSchema>;

export const upsertBudgetInputSchema = z.object({
  categoryId: idSchema,
  month: monthSchema,
  limitCents: centsSchema.nonnegative(),
});
export type UpsertBudgetInput = z.infer<typeof upsertBudgetInputSchema>;

export const financeOverviewSchema = z.object({
  month: monthSchema,
  /** Sum of every account at the start of the month. */
  openingBalanceCents: centsSchema,
  incomeCents: centsSchema,
  expenseCents: centsSchema,
  /** Current total in reserved accounts. */
  reservedCents: centsSchema,
  /** Current total in non-reserved accounts. */
  availableCents: centsSchema,
  expensesByCategory: z.array(
    z.object({ categoryId: idSchema.nullable(), name: z.string(), amountCents: centsSchema }),
  ),
  /** Last six months, oldest first. Transfers are excluded. */
  monthly: z.array(
    z.object({ month: monthSchema, incomeCents: centsSchema, expenseCents: centsSchema }),
  ),
  budgets: z.array(budgetSchema),
});
export type FinanceOverview = z.infer<typeof financeOverviewSchema>;

export const updateAccountInputSchema = createAccountInputSchema.partial().extend({
  archived: z.boolean().optional(),
});
export type UpdateAccountInput = z.infer<typeof updateAccountInputSchema>;

export const createFinanceCategoryInputSchema = z.object({
  name: z.string().trim().min(1, 'Dê um nome à categoria').max(60),
  kind: z.enum(['income', 'expense']),
  icon: z.string().trim().min(1).max(48).optional(),
});
export type CreateFinanceCategoryInput = z.infer<typeof createFinanceCategoryInputSchema>;

export const updateFinanceCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  icon: z.string().trim().min(1).max(48).optional(),
});
export type UpdateFinanceCategoryInput = z.infer<typeof updateFinanceCategoryInputSchema>;

export const updateTransactionInputSchema = z.object({
  description: z.string().trim().min(1).max(120).optional(),
  amountCents: centsSchema.positive().optional(),
  date: dateSchema.optional(),
  categoryId: idSchema.nullish(),
  accountId: idSchema.optional(),
  toAccountId: idSchema.nullish(),
  note: z.string().max(500).nullish(),
});
export type UpdateTransactionInput = z.infer<typeof updateTransactionInputSchema>;

export const listTransactionsQuerySchema = z.object({
  month: monthSchema.optional(),
  accountId: idSchema.optional(),
  categoryId: idSchema.optional(),
  type: transactionTypeSchema.optional(),
});
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

/** Saldo projetado de uma conta-reserva: quando o ritmo de aportes chega à meta. */
export const reserveProjectionSchema = z.object({
  goalId: idSchema,
  accountId: idSchema,
  targetCents: centsSchema,
  balanceCents: centsSchema,
  /** Média mensal de aportes líquidos nos últimos 3 meses. */
  monthlyPaceCents: centsSchema,
  /** `YYYY-MM-DD` estimado, ou nulo quando não há ritmo para projetar. */
  projectedDate: dateSchema.nullable(),
});
export type ReserveProjection = z.infer<typeof reserveProjectionSchema>;
