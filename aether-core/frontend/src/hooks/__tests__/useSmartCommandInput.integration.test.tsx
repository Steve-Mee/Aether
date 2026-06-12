import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useSmartCommandInput } from '../useSmartCommandInput';

vi.mock('@/lib/config/env', () => ({
  env: { dataSource: 'mock' as const },
}));

const contextInput = {
  dashboard: {
    status: 'live' as const,
    productCount: 10,
    lowMarginProducts: 1,
    unreadEmails: 2,
    pendingApprovals: 2,
    recentCommands: 5,
    revenueUplift30d: 500,
  },
  todayReady: [],
  settings: undefined,
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

function wrapper({ children }: { children: React.ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: queryClient },
    createElement(MemoryRouter, { initialEntries: ['/approvals'] }, children),
  );
}

describe('useSmartCommandInput integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('detects high-risk intent and ranks matching suggestions after debounce', () => {
    const onIntentChange = vi.fn();
    const { result } = renderHook(
      () =>
        useSmartCommandInput({
          contextInput,
          onIntentChange,
        }),
      { wrapper },
    );

    act(() => {
      result.current.setCommand('goedkeur');
    });

    act(() => {
      vi.advanceTimersByTime(60);
    });

    expect(result.current.detected.id).toBe('HIGH_RISK_APPROVALS');
    expect(result.current.showIntentPill).toBe(true);
    expect(onIntentChange).toHaveBeenCalledWith('HIGH_RISK_APPROVALS');
    expect(result.current.suggestions.some((s) => s.intentId === 'HIGH_RISK_APPROVALS')).toBe(true);
  });
});
