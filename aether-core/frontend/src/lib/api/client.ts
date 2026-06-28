import { tryRefreshAccessToken } from '@/lib/auth/authRefresh';
import { env } from '@/lib/config';
import {
  getSentryTraceHeaders,
  isErrorAlreadyReported,
  markErrorAsReported,
  reportError,
} from '@/lib/observability/errorReporter';
import { shouldReportError } from './errors';
import { logger } from '@/lib/observability/logger';
import { ApiError, classifyError, isRetryableStatus, NetworkError } from './errors';

const DEFAULT_TIMEOUT_MS = 30_000;

export interface ApiClientOptions {
  /** Retry GET requests on transient failures (default: true for GET). */
  retry?: boolean;
  /** Max retry attempts (default: 3). */
  maxRetries?: number;
  /** Request timeout in milliseconds (default: 30000). */
  timeoutMs?: number;
  /** External abort signal — combined with timeout signal. */
  signal?: AbortSignal;
  /** Skip access-token refresh attempt on HTTP 401. */
  skipRefresh?: boolean;
}

/** Optional auth token override — set by auth module when real tokens arrive. */
let authTokenOverride: string | null = null;
/** Tenant from auth session — falls back to env.tenantId when unset. */
let authTenantOverride: string | null = null;
let onUnauthorized: (() => void) | null = null;

export function setOnUnauthorized(handler: (() => void) | null): void {
  onUnauthorized = handler;
}

export function setAuthToken(token: string | null): void {
  authTokenOverride = token;
}

export function setAuthTenantId(tenantId: string | null): void {
  authTenantOverride = tenantId;
}

export function getAuthTenantId(): string {
  return authTenantOverride ?? env.tenantId;
}

export function getApiConfig(): {
  apiUrl: string;
  tenantId: string;
  hasApiKey: boolean;
} {
  return {
    apiUrl: env.apiUrl || 'http://localhost:9000',
    tenantId: getAuthTenantId(),
    hasApiKey: Boolean(env.apiKey),
  };
}

function createRequestId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `req-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function combineSignals(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller.signal;
}

function createTimeoutSignal(timeoutMs: number): AbortSignal {
  if (typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutMs);
  }
  const controller = new AbortController();
  setTimeout(
    () => controller.abort(new DOMException('Request timeout', 'TimeoutError')),
    timeoutMs,
  );
  return controller.signal;
}

function buildRequestSignal(
  externalSignal: AbortSignal | undefined,
  timeoutMs: number,
): AbortSignal {
  const signals: AbortSignal[] = [createTimeoutSignal(timeoutMs)];
  if (externalSignal) signals.push(externalSignal);
  return combineSignals(signals);
}

function buildAuthHeaders(requestId: string): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Aether-Api-Key': env.apiKey,
    'X-Aether-Tenant-Id': getAuthTenantId(),
    'X-Request-Id': requestId,
  };
  if (authTokenOverride) {
    headers.Authorization = `Bearer ${authTokenOverride}`;
  }
  Object.assign(headers, getSentryTraceHeaders());
  return headers;
}

async function parseErrorResponse(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({ error: res.statusText }));
  const message =
    typeof body === 'object' && body !== null && 'error' in body
      ? String((body as { error: unknown }).error)
      : `API error ${res.status}`;
  return new ApiError(message, res.status, { body });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  clientOptions: ApiClientOptions = {},
): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase();
  const shouldRetry = clientOptions.retry ?? (method === 'GET' || method === 'HEAD');
  const maxRetries = clientOptions.maxRetries ?? 3;
  const timeoutMs = clientOptions.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = `${env.apiUrl}${path}`;
  const requestId = createRequestId();

  let lastError: unknown;

  for (let attempt = 0; attempt < (shouldRetry ? maxRetries : 1); attempt++) {
    const signal = buildRequestSignal(clientOptions.signal, timeoutMs);

    try {
      if (env.isDev) {
        logger.debug('api.request', { method, path, requestId, attempt });
      }

      const res = await fetch(url, {
        ...options,
        signal,
        credentials: 'include',
        headers: {
          ...buildAuthHeaders(requestId),
          ...(options.headers || {}),
        },
      });

      if (!res.ok) {
        const apiErr = await parseErrorResponse(res);
        if (apiErr.status === 401 && !clientOptions.skipRefresh) {
          const refreshed = await tryRefreshAccessToken();
          if (refreshed) {
            authTokenOverride = refreshed;
            continue;
          }
        }
        if (apiErr.status === 401 && onUnauthorized) {
          onUnauthorized();
        }
        if (shouldRetry && isRetryableStatus(res.status) && attempt < maxRetries - 1) {
          await sleep(2 ** attempt * 300);
          continue;
        }
        logger.warn('fetch.http_error', {
          path,
          requestId,
          status: apiErr.status,
          kind: classifyError(apiErr).kind,
        });
        if (shouldReportError(apiErr) && !isErrorAlreadyReported(apiErr)) {
          markErrorAsReported(apiErr);
          reportError(apiErr, {
            path,
            method,
            requestId,
            status: apiErr.status,
            source: 'api',
            transportReported: true,
            kind: classifyError(apiErr).kind,
          });
        }
        throw apiErr;
      }

      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (isAbortError(err)) {
        const timeoutErr = new NetworkError(
          err instanceof Error ? err.message : 'Request aborted',
          { cause: err },
        );
        logger.warn('fetch.aborted', { path, requestId, method }, timeoutErr);
        if (shouldReportError(timeoutErr) && !isErrorAlreadyReported(timeoutErr)) {
          markErrorAsReported(timeoutErr);
          reportError(timeoutErr, {
            path,
            method,
            requestId,
            aborted: true,
            source: 'api',
            transportReported: true,
          });
        }
        throw timeoutErr;
      }
      if (err instanceof ApiError) throw err;
      if (shouldRetry && attempt < maxRetries - 1) {
        await sleep(2 ** attempt * 300);
        continue;
      }
      const networkErr = new NetworkError(err instanceof Error ? err.message : String(err), {
        cause: err,
      });
      logger.warn('fetch.network_error', { path, requestId, attempt }, networkErr);
      if (shouldReportError(networkErr) && !isErrorAlreadyReported(networkErr)) {
        markErrorAsReported(networkErr);
        reportError(networkErr, {
          path,
          method,
          requestId,
          attempt,
          source: 'api',
          transportReported: true,
        });
      }
      throw networkErr;
    }
  }

  const final = lastError instanceof Error ? lastError : new NetworkError(String(lastError));
  logger.error('fetch.exhausted', { path, method, requestId }, final);
  if (shouldReportError(final) && !isErrorAlreadyReported(final)) {
    markErrorAsReported(final);
    reportError(final, {
      path,
      method,
      requestId,
      exhausted: true,
      source: 'api',
      transportReported: true,
    });
  }
  throw final;
}

export async function apiStreamFetch(path: string, signal?: AbortSignal): Promise<Response> {
  const requestId = createRequestId();
  const method = 'GET';
  try {
    const res = await fetch(`${env.apiUrl}${path}`, {
      credentials: 'include',
      headers: {
        'X-Aether-Api-Key': env.apiKey,
        'X-Aether-Tenant-Id': getAuthTenantId(),
        'X-Request-Id': requestId,
        Accept: 'text/event-stream',
        ...(authTokenOverride ? { Authorization: `Bearer ${authTokenOverride}` } : {}),
      },
      signal,
    });
    if (!res.ok) {
      const apiErr = await parseErrorResponse(res);
      if (shouldReportError(apiErr) && !isErrorAlreadyReported(apiErr)) {
        markErrorAsReported(apiErr);
        reportError(apiErr, {
          path,
          method,
          requestId,
          status: apiErr.status,
          source: 'api_stream',
          transportReported: true,
          kind: classifyError(apiErr).kind,
        });
      }
      throw apiErr;
    }
    return res;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isAbortError(err)) {
      const timeoutErr = new NetworkError(err instanceof Error ? err.message : 'Stream aborted', {
        cause: err,
      });
      if (shouldReportError(timeoutErr) && !isErrorAlreadyReported(timeoutErr)) {
        markErrorAsReported(timeoutErr);
        reportError(timeoutErr, {
          path,
          method,
          requestId,
          aborted: true,
          source: 'api_stream',
          transportReported: true,
        });
      }
      throw timeoutErr;
    }
    const networkErr = new NetworkError(err instanceof Error ? err.message : String(err), {
      cause: err,
    });
    if (shouldReportError(networkErr) && !isErrorAlreadyReported(networkErr)) {
      markErrorAsReported(networkErr);
      reportError(networkErr, {
        path,
        method,
        requestId,
        source: 'api_stream',
        transportReported: true,
      });
    }
    throw networkErr;
  }
}

export async function apiStreamPostFetch(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  const requestId = createRequestId();
  const method = 'POST';
  try {
    const res = await fetch(`${env.apiUrl}${path}`, {
      method,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Aether-Api-Key': env.apiKey,
        'X-Aether-Tenant-Id': getAuthTenantId(),
        'X-Request-Id': requestId,
        Accept: 'text/event-stream',
        ...(authTokenOverride ? { Authorization: `Bearer ${authTokenOverride}` } : {}),
      },
      body: JSON.stringify(body),
      signal,
    });
    if (!res.ok) {
      const apiErr = await parseErrorResponse(res);
      throw apiErr;
    }
    return res;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isAbortError(err)) {
      throw new NetworkError(err instanceof Error ? err.message : 'Stream aborted', { cause: err });
    }
    throw new NetworkError(err instanceof Error ? err.message : String(err), { cause: err });
  }
}
