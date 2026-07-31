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
import type { CommandResult } from '@/types/command';

const envMock = vi.hoisted(() => ({
  dataSource: 'mock' as 'mock' | 'live',
  isMockMode: true,
  isLiveMode: false,
  liveDemo: false,
}));

vi.mock('@/lib/config/env', () => ({
  env: envMock,
}));

vi.mock('@/lib/settings/MerchantSettingsContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/settings/MerchantSettingsContext')>();
  return {
    ...actual,
    useMerchantSettings: () => ({
      settings: { autonomyLevel: 'balanced' },
      loading: false,
      error: null,
      reload: vi.fn(),
      updateSettings: vi.fn(),
      updateNotificationPrefs: vi.fn(),
    }),
  };
});

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

function createWrapper(queryClient: QueryClient, adapter = createTestDataAdapter()) {
  setDataAdapterForTests(adapter);
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
    envMock.dataSource = 'mock';
    envMock.isMockMode = true;
    envMock.isLiveMode = false;
    envMock.liveDemo = false;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('runCommand in mock mode calls data layer executeCommand and uses demo response', async () => {
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
    expect(result.current.demoResult?.preparedHeadline).toBe('Leverancierssync kan starten');
  });

  it('runCommand in live mode uses API result without demo UI overlay', async () => {
    envMock.dataSource = 'live';
    envMock.isMockMode = false;
    envMock.isLiveMode = true;

    const liveApiResult: CommandResult = {
      success: true,
      originalCommand: 'Sync leveranciers',
      result: 'Live API: leveranciers gesynchroniseerd',
      parsedIntent: 'supplier.sync',
      confidence: 0.88,
      timestamp: '2026-07-30T12:00:00.000Z',
      commandId: 'live-cmd-1',
    };

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });

    const liveAdapter = createTestDataAdapter({
      executeCommand: async () => liveApiResult,
    });

    const { result } = renderHook(() => useCommandDemoFlow({}), {
      wrapper: createWrapper(queryClient, liveAdapter),
    });

    await act(async () => {
      const run = result.current.runCommand('Sync leveranciers');
      await vi.runAllTimersAsync();
      await run;
    });

    await waitFor(() => {
      expect(result.current.demoResult).not.toBeNull();
    });

    expect(result.current.demoResult?.result).toBe('Live API: leveranciers gesynchroniseerd');
    expect(result.current.demoResult?.preparedHeadline).toBe('supplier.sync');
    expect(result.current.demoResult?.commandId).toBe('live-cmd-1');
    expect(result.current.demoResult?.highlights).toEqual([]);
  });
});
