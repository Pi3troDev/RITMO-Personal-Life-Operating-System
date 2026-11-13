import {
  boardSchema,
  taskSchema,
  type CreateTaskInput,
  type Task,
  type TaskView,
  type UpdateTaskInput,
} from '@ritmo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/http';

const tasksSchema = z.array(taskSchema);

export const tasksKey = (view: TaskView) => ['tasks', view] as const;

export function useBoard() {
  return useQuery({
    queryKey: ['board', 'default'],
    queryFn: () => api.get('/boards/default', { schema: boardSchema }),
    staleTime: 5 * 60_000,
  });
}

export function useTasks(view: TaskView) {
  return useQuery({
    queryKey: tasksKey(view),
    queryFn: () => api.get('/tasks', { query: { view }, schema: tasksSchema }),
  });
}

function useInvalidateTasks() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    void queryClient.invalidateQueries({ queryKey: ['day'] });
    void queryClient.invalidateQueries({ queryKey: ['goals'] });
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
  };
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (input: CreateTaskInput) => api.post('/tasks', input, { schema: taskSchema }),
    onSettled: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateTaskInput & { id: string }) =>
      api.patch(`/tasks/${id}`, input, { schema: taskSchema }),
    // Moving a card must feel instant; the server response replaces the optimistic value.
    onMutate: async ({ id, columnId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previous = queryClient.getQueryData<Task[]>(tasksKey('all'));
      if (previous && (columnId || status)) {
        const board = queryClient.getQueryData<z.infer<typeof boardSchema>>(['board', 'default']);
        const column = board?.columns.find((c) => c.id === columnId || c.statusCategory === status);
        if (column) {
          queryClient.setQueryData<Task[]>(
            tasksKey('all'),
            previous.map((t) =>
              t.id === id ? { ...t, columnId: column.id, status: column.statusCategory } : t,
            ),
          );
        }
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(tasksKey('all'), context.previous);
    },
    onSettled: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSettled: invalidate,
  });
}
