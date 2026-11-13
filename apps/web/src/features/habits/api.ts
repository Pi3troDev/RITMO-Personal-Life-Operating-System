import { habitCheckinSchema, habitSchema } from '@ritmo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/http';

export function useHabits() {
  return useQuery({
    queryKey: ['habits', 'list'],
    queryFn: () => api.get('/habits', { schema: z.array(habitSchema) }),
  });
}

export function useHabitCheckins() {
  return useQuery({
    queryKey: ['habits', 'checkins'],
    queryFn: () => api.get('/habits/checkins', { schema: z.array(habitCheckinSchema) }),
  });
}

export function useSetCheckin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      habitId,
      date,
      status,
    }: {
      habitId: string;
      date: string;
      /** `null` removes the check-in. */
      status: 'done' | 'skipped' | null;
    }) =>
      status
        ? api.put(`/habits/${habitId}/checkins/${date}`, { status })
        : api.delete(`/habits/${habitId}/checkins/${date}`),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['habits'] });
      void queryClient.invalidateQueries({ queryKey: ['day'] });
      void queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });
}
