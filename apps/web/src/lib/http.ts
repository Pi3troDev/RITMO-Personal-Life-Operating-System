import { apiErrorSchema } from '@ritmo/shared';
import type { z } from 'zod';

export const API_BASE = '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type QueryValue = string | number | boolean | null | undefined;

interface RequestOptions<S extends z.ZodType | undefined> {
  query?: Record<string, QueryValue>;
  body?: unknown;
  /** When given, the response body is validated and typed by this schema. */
  schema?: S;
  signal?: AbortSignal;
}

type Result<S> = S extends z.ZodType ? z.infer<S> : void;

// The access token lives only in memory; the refresh token is an httpOnly cookie.
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function setSessionExpiredHandler(handler: (() => void) | null) {
  onSessionExpired = handler;
}

function buildUrl(path: string, query?: Record<string, QueryValue>) {
  const url = new URL(API_BASE + path, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  return url;
}

async function toApiError(response: Response): Promise<ApiError> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);
  if (parsed.success) {
    const { code, message, details } = parsed.data.error;
    return new ApiError(response.status, code, message, details);
  }
  return new ApiError(
    response.status,
    'UNEXPECTED',
    'Não foi possível concluir a operação. Tente novamente.',
  );
}

async function send(method: string, path: string, options: RequestOptions<z.ZodType | undefined>) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  try {
    return await fetch(buildUrl(path, options.query), {
      method,
      headers,
      credentials: 'include',
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new ApiError(0, 'NETWORK', 'Sem conexão com o servidor. Verifique sua internet.');
  }
}

/** Exchanges the refresh cookie for a new access token. Concurrent callers share one request. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const response = await send('POST', '/auth/refresh', {});
      if (!response.ok) return false;
      const data = (await response.json()) as { accessToken?: string };
      if (!data.accessToken) return false;
      accessToken = data.accessToken;
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<S extends z.ZodType | undefined = undefined>(
  method: string,
  path: string,
  options: RequestOptions<S> = {},
): Promise<Result<S>> {
  let response = await send(method, path, options);

  if (response.status === 401 && !path.startsWith('/auth/')) {
    if (await refreshSession()) {
      response = await send(method, path, options);
    } else {
      accessToken = null;
      onSessionExpired?.();
    }
  }

  if (!response.ok) throw await toApiError(response);
  if (!options.schema || response.status === 204) return undefined as Result<S>;
  return options.schema.parse(await response.json()) as Result<S>;
}

type BodyOptions<S extends z.ZodType | undefined> = Omit<RequestOptions<S>, 'body'>;

export const api = {
  get: <S extends z.ZodType | undefined = undefined>(path: string, options?: BodyOptions<S>) =>
    request<S>('GET', path, options),
  post: <S extends z.ZodType | undefined = undefined>(
    path: string,
    body?: unknown,
    options?: BodyOptions<S>,
  ) => request<S>('POST', path, { ...options, body }),
  put: <S extends z.ZodType | undefined = undefined>(
    path: string,
    body?: unknown,
    options?: BodyOptions<S>,
  ) => request<S>('PUT', path, { ...options, body }),
  patch: <S extends z.ZodType | undefined = undefined>(
    path: string,
    body?: unknown,
    options?: BodyOptions<S>,
  ) => request<S>('PATCH', path, { ...options, body }),
  delete: (path: string, options?: BodyOptions<undefined>) => request('DELETE', path, options),
};

/** Message safe to show to the user for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Algo não saiu como esperado. Tente novamente.';
}
