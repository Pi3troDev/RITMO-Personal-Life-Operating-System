import { areaSchema, type Area } from '@ritmo/shared';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { z } from 'zod';
import { api } from '@/lib/http';

export const areasKey = ['areas'] as const;

export function useAreas() {
  return useQuery({
    queryKey: areasKey,
    queryFn: () => api.get('/areas', { schema: z.array(areaSchema) }),
    staleTime: 5 * 60_000,
  });
}

/** Areas indexed by id, for rendering rows that only carry an `areaId`. */
export function useAreaMap(): Map<string, Area> {
  const { data } = useAreas();
  return useMemo(() => new Map((data ?? []).map((a) => [a.id, a])), [data]);
}
