import { authSessionSchema, type LoginInput, type RegisterInput } from '@ritmo/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, setAccessToken, setSessionExpiredHandler } from '@/lib/http';
import { useEffect } from 'react';

export const sessionKey = ['session'] as const;

/** Restores the session from the refresh cookie. `null` means signed out. */
export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: async () => {
      try {
        const session = await api.post('/auth/refresh', undefined, { schema: authSessionSchema });
        setAccessToken(session.accessToken);
        return session.user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
    staleTime: Infinity,
    retry: false,
  });
}

/** Signs the user out locally whenever the API reports an expired session. */
export function useSessionExpiry() {
  const queryClient = useQueryClient();
  useEffect(() => {
    setSessionExpiredHandler(() => {
      queryClient.setQueryData(sessionKey, null);
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' });
    });
    return () => setSessionExpiredHandler(null);
  }, [queryClient]);
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => api.post('/auth/login', input, { schema: authSessionSchema }),
    onSuccess: (session) => {
      setAccessToken(session.accessToken);
      queryClient.setQueryData(sessionKey, session.user);
    },
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api.post('/auth/register', input, { schema: authSessionSchema }),
    onSuccess: (session) => {
      setAccessToken(session.accessToken);
      queryClient.setQueryData(sessionKey, session.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      setAccessToken(null);
      queryClient.clear();
      queryClient.setQueryData(sessionKey, null);
    },
  });
}
