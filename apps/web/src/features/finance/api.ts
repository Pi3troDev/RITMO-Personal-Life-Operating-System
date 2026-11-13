import {
  accountSchema,
  financeCategorySchema,
  financeOverviewSchema,
  transactionSchema,
  type CreateTransactionInput,
} from '@ritmo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/http';

export function useFinanceOverview(month: string) {
  return useQuery({
    queryKey: ['finance', 'overview', month],
    queryFn: () => api.get('/finance/overview', { query: { month }, schema: financeOverviewSchema }),
  });
}

export function useAccounts() {
  return useQuery({
    queryKey: ['finance', 'accounts'],
    queryFn: () => api.get('/finance/accounts', { schema: z.array(accountSchema) }),
  });
}

export function useFinanceCategories() {
  return useQuery({
    queryKey: ['finance', 'categories'],
    queryFn: () => api.get('/finance/categories', { schema: z.array(financeCategorySchema) }),
    staleTime: 5 * 60_000,
  });
}

export function useTransactions(month: string) {
  return useQuery({
    queryKey: ['finance', 'transactions', month],
    queryFn: () => api.get('/finance/transactions', { query: { month }, schema: z.array(transactionSchema) }),
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      api.post('/finance/transactions', input, { schema: transactionSchema }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['finance'] });
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
