import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { useCommandDemoFlow } from '../useCommandDemoFlow';
import { CommandProvider } from '@/lib/CommandContext';
import { setDataAdapterForTests } from '@/lib/data/createDataAdapter';
import { createTestDataAdapter } from '@/test/createTestDataAdapter';
import { ACTIVITY_ITEM_EVENT } from '@/lib/aetherLiveBus';

vi.mock('@/lib/config/env', () => ({
  env: { dataSource: 'mock' as const, liveDemo: false },
}));

vi.mock('@/lib/settings/MerchantSettingsContext', () => ({
  useMerchantSettings: () => ({
    settings: { autonomyLevel: 'balanced' },
  }),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

function createWrapper(queryClient: QueryClient) {
  setDataAdapterForTests(createTestDataAdapter());
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries: ['/command-center'] },
        createElement(CommandProvider, null, children),
      ),
    );
  };
}

describe('useCommandDemoFlow integration', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runCommand in mock mode calls data layer executeCommand', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const { result } = renderHook(() => useCommandDemoFlow({}), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      const run = result.current.runCommand('Sync leveranciers');
      await vi.runAllTimersAsync();
      await run;
    });

    await waitFor(() => {
      expect(result.current.demoResult).not.toBeNull();
    });

    const activityEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === ACTIVITY_ITEM_EVENT);
    expect(activityEvents.length).toBeGreaterThan(0);
    expect(result.current.demoResult?.success).toBe(true);
  });
});
