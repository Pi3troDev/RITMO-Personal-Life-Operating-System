import { goalSchema, type CreateGoalInput } from '@ritmo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/http';

export function useGoals() {
  return useQuery({
    queryKey: ['goals', 'list'],
    queryFn: () => api.get('/goals', { schema: z.array(goalSchema) }),
  });
}

export function useToggleMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      milestoneId,
      done,
    }: {
      goalId: string;
      milestoneId: string;
      done: boolean;
    }) => api.patch(`/goals/${goalId}/milestones/${milestoneId}`, { done }, { schema: goalSchema }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGoalInput) => api.post('/goals', input, { schema: goalSchema }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useAddMilestone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, title }: { goalId: string; title: string }) =>
      api.post(`/goals/${goalId}/milestones`, { title }, { schema: goalSchema }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}
