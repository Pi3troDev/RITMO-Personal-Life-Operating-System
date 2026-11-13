import { ErrorState } from '@/components/shared/states';

/** Last-resort boundary for unexpected rendering errors. */
export function RouteError() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <ErrorState error={new Error('render')} onRetry={() => window.location.reload()} />
    </div>
  );
}
