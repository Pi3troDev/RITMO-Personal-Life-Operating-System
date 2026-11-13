import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@/features/auth/api';
import { ErrorState } from '@/components/shared/states';

function FullScreenLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background" aria-busy aria-label="Carregando">
      <span className="size-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

export function RequireAuth() {
  const { data: user, isPending, isError, error, refetch } = useSession();
  const location = useLocation();

  if (isPending) return <FullScreenLoading />;
  if (isError)
    return (
      <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </div>
    );
  if (!user) return <Navigate to="/entrar" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

export function GuestOnly() {
  const { data: user, isPending } = useSession();
  if (isPending) return <FullScreenLoading />;
  if (user) return <Navigate to="/meu-dia" replace />;
  return <Outlet />;
}
