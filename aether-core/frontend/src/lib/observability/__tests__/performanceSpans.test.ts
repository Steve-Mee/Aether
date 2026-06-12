import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/config', () => ({
  env: {
    sentryActive: false,
  },
}));

describe('performanceSpans', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('withBusinessSpan runs fn directly when Sentry is inactive', async () => {
    const { withBusinessSpan } = await import('../performanceSpans');
    const result = await withBusinessSpan('approval.bulk_resolve', { count: 3 }, async () => 42);
    expect(result).toBe(42);
  });

  it('withBusinessSpan merges tenantId and module from observability context', async () => {
    vi.doMock('@/lib/config', () => ({
      env: { sentryActive: true },
    }));

    const startSpan = vi.fn((_opts: unknown, fn: () => Promise<number>) => fn());
    vi.doMock('@sentry/react', () => ({
      startSpan,
    }));

    vi.doMock('../errorReporter', () => ({
      getObservabilityContext: () => ({ tenantId: 'tenant-42', module: 'approvals' }),
    }));

    const { withBusinessSpan, resetPerformanceSpansForTests } = await import('../performanceSpans');
    const result = await withBusinessSpan('approval.resolve', { count: 2 }, async () => 99);

    expect(result).toBe(99);
    expect(startSpan).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'approval.resolve',
        attributes: expect.objectContaining({
          count: 2,
          tenantId: 'tenant-42',
          module: 'approvals',
        }),
      }),
      expect.any(Function),
    );
    resetPerformanceSpansForTests();
  });
});
