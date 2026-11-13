import { captureResultSchema, type CreateCaptureInput } from '@ritmo/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/http';

export function useCapture() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCaptureInput) =>
      api.post('/capture', input, { schema: captureResultSchema }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
      void queryClient.invalidateQueries({ queryKey: ['day'] });
    },
  });
}
