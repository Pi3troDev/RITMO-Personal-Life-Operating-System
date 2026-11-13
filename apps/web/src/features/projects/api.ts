import {
  projectSchema,
  taskSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '@ritmo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/lib/http';

export function useProjects() {
  return useQuery({
    queryKey: ['projects', 'list'],
    queryFn: () => api.get('/projects', { schema: z.array(projectSchema) }),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ['projects', 'detail', id],
    queryFn: () => api.get(`/projects/${id}`, { schema: projectSchema }),
  });
}

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: ['tasks', 'project', projectId],
    queryFn: () => api.get('/tasks', { query: { projectId }, schema: z.array(taskSchema) }),
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.post('/projects', input, { schema: projectSchema }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateProjectInput & { id: string }) =>
      api.patch(`/projects/${id}`, input, { schema: projectSchema }),
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });
}
