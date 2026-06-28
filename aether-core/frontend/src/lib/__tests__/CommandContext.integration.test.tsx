import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createElement } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { CommandProvider, useCommand } from '../CommandContext';
import { setDataAdapterForTests } from '@/lib/data/createDataAdapter';
import { createTestDataAdapter } from '@/test/createTestDataAdapter';
import { buildCommandResult } from '@/test/factories/command';
import { COMMAND_EXECUTED_EVENT } from '@/lib/data/commandEvents';
import { ACTIVITY_ITEM_EVENT, NOTIFICATION_EVENT } from '@/lib/aetherLiveBus';
import { queryKeys } from '@/lib/query/keys';

const navigateMock = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock('@/lib/config/env', () => ({
  env: { dataSource: 'mock' as const },
}));

function createWrapper(
  queryClient: QueryClient,
  adapter = createTestDataAdapter(),
  initialEntries: string[] = ['/command-center'],
) {
  setDataAdapterForTests(adapter);

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(
        MemoryRouter,
        { initialEntries },
        createElement(CommandProvider, null, children),
      ),
    );
  };
}

describe('CommandContext integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    navigateMock.mockReset();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    vi.spyOn(queryClient, 'invalidateQueries');
  });

  it('executeCommand sets lastResult, history, invalidates cache, and dispatches event', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useCommand(), {
      wrapper: createWrapper(queryClient),
    });

    const commandResult = await result.current.executeCommand('Toon goedkeuringen');

    await waitFor(() => {
      expect(result.current.lastResult).not.toBeNull();
    });

    expect(commandResult.success).toBe(true);
    expect(result.current.history[0]?.originalCommand).toBe('Toon goedkeuringen');
    expect(result.current.error).toBeNull();
    expect(navigateMock).not.toHaveBeenCalled();

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.activity({ days: 7, limit: 5 }) }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.approvals.all() }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['outcomes']) }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: expect.arrayContaining(['autonomy-metrics']) }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: queryKeys.commands.history() }),
    );

    const activityEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === ACTIVITY_ITEM_EVENT);
    expect(activityEvents.length).toBeGreaterThan(0);
    expect(activityEvents[0]?.detail?.category).toBe('command');

    const commandEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as Event)
      .filter((e) => e.type === COMMAND_EXECUTED_EVENT);
    expect(commandEvents.length).toBeGreaterThan(0);
  });

  it('navigates to intent route when not on command center home', async () => {
    const { result } = renderHook(() => useCommand(), {
      wrapper: createWrapper(queryClient, createTestDataAdapter(), ['/suppliers']),
    });

    await result.current.executeCommand('Toon goedkeuringen');

    await waitFor(() => {
      expect(result.current.lastResult).not.toBeNull();
    });

    expect(navigateMock).toHaveBeenCalledWith('/approvals');
  });

  it('dispatches activity item but not notification on successful command execute', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useCommand(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.executeCommand('Sync voorraad');

    await waitFor(() => {
      expect(result.current.lastResult).not.toBeNull();
    });

    const activityEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === ACTIVITY_ITEM_EVENT);
    expect(activityEvents.length).toBeGreaterThan(0);

    const notificationEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === NOTIFICATION_EVENT);
    expect(notificationEvents.length).toBe(0);
  });

  it('sets error when execute fails and does not navigate', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { result } = renderHook(() => useCommand(), {
      wrapper: createWrapper(queryClient, createTestDataAdapter({ executeFails: true })),
    });

    await expect(result.current.executeCommand('fail')).rejects.toThrow();
    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(navigateMock).not.toHaveBeenCalled();
    expect(result.current.lastResult).toBeNull();

    const activityEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as CustomEvent)
      .filter((e) => e.type === ACTIVITY_ITEM_EVENT);
    expect(activityEvents.length).toBe(0);
  });

  it('undoLastCommand clears undoable flag and invalidates cache', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const undoable = buildCommandResult({
      originalCommand: 'undo me',
      commandId: 'cmd-undo-1',
      undoable: true,
      parsedIntent: 'test.intent',
    });
    const adapter = createTestDataAdapter({
      executeCommand: async () => undoable,
    });
    setDataAdapterForTests(adapter);

    const { result } = renderHook(() => useCommand(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.executeCommand('undo me');
    await waitFor(() => expect(result.current.lastResult?.undoable).toBe(true));

    const invalidateBefore = vi.mocked(queryClient.invalidateQueries).mock.calls.length;
    await result.current.undoLastCommand();

    await waitFor(() => {
      expect(result.current.lastResult?.undoable).toBe(false);
    });
    expect(vi.mocked(queryClient.invalidateQueries).mock.calls.length).toBeGreaterThan(
      invalidateBefore,
    );

    const commandEvents = dispatchSpy.mock.calls
      .map((c) => c[0] as Event)
      .filter((e) => e.type === COMMAND_EXECUTED_EVENT);
    expect(commandEvents.length).toBeGreaterThanOrEqual(2);
  });
});
