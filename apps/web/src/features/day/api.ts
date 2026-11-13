import {
  dayOverviewSchema,
  reflectionSchema,
  type DayItem,
  type SetFocusInput,
  type UpsertReflectionInput,
} from '@ritmo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';

export const dayKey = (date: string) => ['day', date] as const;

export function useDay(date: string) {
  return useQuery({
    queryKey: dayKey(date),
    queryFn: () => api.get('/day', { query: { date }, schema: dayOverviewSchema }),
  });
}

function useInvalidateDay() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['day'] });
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['habits'] });
  };
}

/** Completes or reopens an item of the day, whatever it is (task or habit). */
export function useToggleDayItem(date: string) {
  const invalidate = useInvalidateDay();
  return useMutation({
    mutationFn: async (item: DayItem) => {
      const done = item.status === 'done';
      if (item.kind === 'task') {
        await api.patch(`/tasks/${item.refId}`, { status: done ? 'todo' : 'done' });
      } else if (item.kind === 'habit') {
        if (done) await api.delete(`/habits/${item.refId}/checkins/${date}`);
        else await api.put(`/habits/${item.refId}/checkins/${date}`, { status: 'done' });
      }
    },
    onSettled: invalidate,
  });
}

export function useSetFocus(date: string) {
  const invalidate = useInvalidateDay();
  return useMutation({
    mutationFn: (input: SetFocusInput) =>
      api.put(`/day/${date}/focus`, input, { schema: dayOverviewSchema }),
    onSettled: invalidate,
  });
}

export function useSaveReflection(date: string) {
  const invalidate = useInvalidateDay();
  return useMutation({
    mutationFn: (input: UpsertReflectionInput) =>
      api.put(`/day/${date}/reflection`, input, { schema: reflectionSchema }),
    onSettled: invalidate,
  });
}
