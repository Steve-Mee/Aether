import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';
import { render } from '@testing-library/react';
import QueryInvalidationBridge from '../QueryInvalidationBridge';
import { COMMAND_EXECUTED_EVENT } from '@/lib/data/commandEvents';
import { queryKeys } from '../keys';

describe('QueryInvalidationBridge integration', () => {
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

  function mountBridge() {
    render(
      createElement(
        QueryClientProvider,
        { client: queryClient },
        createElement(QueryInvalidationBridge),
      ),
    );
  }

  it('invalidates dashboard, activity, home landing queries, and insights on command executed event', async () => {
    mountBridge();
    window.dispatchEvent(new CustomEvent(COMMAND_EXECUTED_EVENT));
    await vi.advanceTimersByTimeAsync(300);

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard(),
    });
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
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['autonomy-metrics']) }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['outcomes']) }),
    );
  });

  it('invalidates approvals and dashboard on approvals-changed event', () => {
    mountBridge();
    window.dispatchEvent(new CustomEvent('aether:approvals-changed'));

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.approvals.all(),
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard(),
    });
  });
});
