import { render } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import {
  ACTIVITY_ITEM_EVENT,
  NOTIFICATION_EVENT,
  SUPPLIER_CHANGE_EVENT,
} from '@/lib/aetherLiveBus';
import { afterSupplierSynced } from '../sideEffects';
import QueryInvalidationBridge from '@/lib/query/QueryInvalidationBridge';
import { queryKeys } from '@/lib/query/keys';

describe('sideEffects cross-screen integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('afterSupplierSynced dispatches supplier and notification events', () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    afterSupplierSynced('sup-test-1', { supplierName: 'Nordic' });

    const types = dispatchSpy.mock.calls.map((c) => (c[0] as CustomEvent).type);
    expect(types).toContain(SUPPLIER_CHANGE_EVENT);
    expect(types).toContain(NOTIFICATION_EVENT);
  });

  it('supplier change event invalidates suppliers and activity via bridge', async () => {
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(QueryInvalidationBridge),
      ),
    );

    window.dispatchEvent(
      new CustomEvent(SUPPLIER_CHANGE_EVENT, {
        detail: { supplierId: 'sup-test-1' },
      }),
    );
    await vi.advanceTimersByTimeAsync(300);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['suppliers'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['activity'],
    });
  });

  it('activity item subscription invalidates activity and home landing queries', async () => {
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(QueryInvalidationBridge),
      ),
    );

    window.dispatchEvent(
      new CustomEvent(ACTIVITY_ITEM_EVENT, {
        detail: {
          id: 'act-1',
          source: 'demo',
          at: '2026-06-04T10:00:00.000Z',
          actionType: 'autonomy_execute',
          actionLabel: 'Sync',
          description: 'Supplier sync',
          module: 'supplier-intelligence',
          category: 'supplier',
        },
      }),
    );
    await vi.advanceTimersByTimeAsync(300);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['activity'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.activity({ days: 7, limit: 5 }),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.list(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.suppliers.overview(),
    });
  });
});
