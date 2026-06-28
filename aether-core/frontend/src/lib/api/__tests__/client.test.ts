import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as authRefresh from '@/lib/auth/authRefresh';
import { apiFetch, setAuthTenantId, setAuthToken, setOnUnauthorized } from '../client';
import { ApiError, NetworkError } from '../errors';

describe('apiFetch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setAuthToken(null);
    setAuthTenantId(null);
    setOnUnauthorized(null);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setAuthToken(null);
    setAuthTenantId(null);
    setOnUnauthorized(null);
  });

  it('sends X-Request-Id header', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/test');

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(headers['X-Request-Id']).toBeDefined();
    expect(headers['X-Request-Id'].length).toBeGreaterThan(0);
  });

  it('propagates Sentry trace headers on API requests', async () => {
    const errorReporter = await import('@/lib/observability/errorReporter');
    const traceSpy = vi.spyOn(errorReporter, 'getSentryTraceHeaders').mockReturnValue({
      'sentry-trace': 'trace-abc',
      baggage: 'baggage-xyz',
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/api/traced');

    const headers = fetchMock.mock.calls[0][1].headers as Record<string, string>;
    expect(traceSpy).toHaveBeenCalled();
    expect(headers['sentry-trace']).toBe('trace-abc');
    expect(headers.baggage).toBe('baggage-xyz');
    traceSpy.mockRestore();
  });

  it('sends auth headers and credentials include', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);
    setAuthToken('access-token-1');
    setAuthTenantId('tenant_session');

    await apiFetch('/api/secure');

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(init.credentials).toBe('include');
    expect(headers['X-Aether-Api-Key']).toBeTruthy();
    expect(headers['X-Aether-Tenant-Id']).toBe('tenant_session');
    expect(headers.Authorization).toBe('Bearer access-token-1');
  });

  it('aborts on timeout', async () => {
    const fetchMock = vi.fn((_url: string, init: RequestInit) => {
      return new Promise((_resolve, reject) => {
        init.signal?.addEventListener('abort', () => {
          reject(new DOMException('Request timeout', 'TimeoutError'));
        });
      });
    });
    vi.stubGlobal('fetch', fetchMock);

    const promise = apiFetch('/api/slow', {}, { timeoutMs: 100, retry: false });
    const assertion = expect(promise).rejects.toBeInstanceOf(NetworkError);
    await vi.advanceTimersByTimeAsync(150);
    await assertion;
  });

  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ items: [1, 2] }),
      }),
    );

    const result = await apiFetch<{ items: number[] }>('/api/items');
    expect(result.items).toEqual([1, 2]);
  });

  it('returns undefined on 204', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      }),
    );

    const result = await apiFetch<void>('/api/empty', { method: 'DELETE' }, { retry: false });
    expect(result).toBeUndefined();
  });

  it('throws ApiError with parsed error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Access denied' }),
      }),
    );

    await expect(apiFetch('/api/forbidden', {}, { retry: false })).rejects.toMatchObject({
      message: 'Access denied',
      status: 403,
    });
  });

  it('retries GET on 503', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        json: async () => ({ error: 'Unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const promise = apiFetch('/api/flaky');
    await vi.advanceTimersByTimeAsync(400);
    const result = await promise;
    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('refreshes token on 401 and retries', async () => {
    const refreshSpy = vi
      .spyOn(authRefresh, 'tryRefreshAccessToken')
      .mockResolvedValue('new-access-token');
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: 'ok' }),
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiFetch<{ data: string }>('/api/protected');
    expect(result.data).toBe('ok');
    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondHeaders = fetchMock.mock.calls[1][1].headers as Record<string, string>;
    expect(secondHeaders.Authorization).toBe('Bearer new-access-token');
  });

  it('calls onUnauthorized when refresh fails on 401', async () => {
    vi.spyOn(authRefresh, 'tryRefreshAccessToken').mockResolvedValue(null);
    const unauthorized = vi.fn();
    setOnUnauthorized(unauthorized);

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Unauthorized' }),
      }),
    );

    await expect(apiFetch('/api/protected', {}, { retry: false })).rejects.toBeInstanceOf(ApiError);
    expect(unauthorized).toHaveBeenCalledTimes(1);
  });
});
