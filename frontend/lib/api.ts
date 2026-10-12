import { ApiError, translateApiMessage } from './errors';

const BASE = '/api/v1';
let refreshing: Promise<boolean> | null = null;

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string> | undefined) ?? {}),
    },
  });
}

/** Single-flight refresh: concurrent 401s share one rotation request. */
function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = rawFetch('/auth/refresh', { method: 'POST' })
      .then((r) => r.ok)
      .catch(() => false)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

export async function api<T>(path: string, init: RequestInit = {}, canRetry = true): Promise<T> {
  const res = await rawFetch(path, init);

  const isAuthCall = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');
  if (res.status === 401 && canRetry && !isAuthCall) {
    if (await refreshSession()) return api<T>(path, init, false);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { message?: unknown; details?: unknown; requestId?: string };
    const details = Array.isArray(body.details) ? (body.details as string[]) : [];
    throw new ApiError(translateApiMessage(body.message, body.details), res.status, details, body.requestId);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
