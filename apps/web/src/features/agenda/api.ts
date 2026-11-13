import {
  agendaItemSchema,
  eventSchema,
  type CreateEventInput,
  type UpdateEventInput,
} from '@ritmo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/http';

export const agendaKey = (from: string, to: string) => ['agenda', from, to] as const;

export function useAgenda(from: string, to: string) {
  return useQuery({
    queryKey: agendaKey(from, to),
    queryFn: () => api.get('/agenda', { query: { from, to }, schema: z.array(agendaItemSchema) }),
    // Keep the previous range on screen while the next one loads, so navigating does not flash.
    placeholderData: (previous) => previous,
  });
}

function useInvalidateAgenda() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['agenda'] });
    void queryClient.invalidateQueries({ queryKey: ['day'] });
  };
}

export function useCreateEvent() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (input: CreateEventInput) => api.post('/events', input, { schema: eventSchema }),
    onSettled: invalidate,
  });
}

export function useUpdateEvent() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateEventInput & { id: string }) =>
      api.patch(`/events/${id}`, input, { schema: eventSchema }),
    onSettled: invalidate,
  });
}

export function useDeleteEvent() {
  const invalidate = useInvalidateAgenda();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/events/${id}`),
    onSettled: invalidate,
  });
}
