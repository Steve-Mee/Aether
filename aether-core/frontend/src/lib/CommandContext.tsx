import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAetherQuery } from '@/lib/query/hooks';
import { routeForIntent } from './intentNavigation';
import { isCommandCenterHome } from '@/lib/navigation/routes';
import { t } from './i18n';
import { useCommandUiStore } from './stores/uiStore';
import { useAppShellStore } from './stores/appShellStore';
import { commandsApi } from '@/features/commands/api';
import { useCommandMutations } from '@/features/commands/hooks/useCommandMutations';
import { queryKeys } from './query/keys';
import { env } from '@/lib/config/env';
import { setObservabilityContext } from '@/lib/observability/errorReporter';
import type { CommandResult } from '@/types/command';
import React from 'react';

export type { CommandResult } from '@/types/command';

interface CommandContextValue {
  executeCommand: (command: string) => Promise<CommandResult>;
  undoLastCommand: () => Promise<void>;
  lastResult: CommandResult | null;
  loading: boolean;
  streaming: boolean;
  streamSteps: import('@/lib/useCommandStream').CommandStreamStep[];
  streamPlan: import('@/lib/useCommandStream').CommandStreamPlan | null;
  streamActiveAgentKey: string | null;
  cancelStream: () => void;
  error: string | null;
  paletteOpen: boolean;
  openPalette: () => void;
  closePalette: () => void;
  history: CommandResult[];
}

const CommandContext = createContext<CommandContextValue | null>(null);

export function CommandProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const setLastCommandAt = useAppShellStore((s) => s.setLastCommandAt);
  const [lastResult, setLastResult] = useState<CommandResult | null>(null);
  const [history, setHistory] = useState<CommandResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const paletteOpen = useCommandUiStore((s) => s.paletteOpen);
  const openPalette = useCommandUiStore((s) => s.openPalette);
  const closePalette = useCommandUiStore((s) => s.closePalette);

  const { data: serverHistory } = useAetherQuery(
    queryKeys.commands.history(),
    () => commandsApi.history(),
    {
      staleTime: 60_000,
      enabled: env.isLiveMode,
      meta: { domain: 'commands', handled: true, silentToast: true },
    },
  );

  useEffect(() => {
    if (!serverHistory?.length) return;
    const mapped: CommandResult[] = serverHistory.map((row) => ({
      success: true,
      result: row.result,
      parsedIntent: row.intent,
      originalCommand: row.command,
      confidence: row.confidence,
      timestamp: row.createdAt,
      commandId: row.id,
      undoable: false,
    }));
    setHistory((prev) => {
      const localIds = new Set(prev.map((h) => h.commandId).filter(Boolean));
      const fromServer = mapped.filter((m) => m.commandId && !localIds.has(m.commandId));
      if (fromServer.length === 0 && prev.length > 0) return prev;
      const merged = [...prev];
      for (const item of fromServer) {
        if (!merged.some((m) => m.commandId === item.commandId)) {
          merged.push(item);
        }
      }
      return merged
        .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
        .slice(0, 20);
    });
  }, [serverHistory]);

  const { executeMutation, undoMutation, loading, streamSteps, streamPlan, streaming, activeAgentKey, cancelStream } = useCommandMutations({
    onExecuteSuccess: (data) => {
      setLastResult(data);
      setHistory((prev) => [data, ...prev].slice(0, 20));
      setLastCommandAt(data.timestamp ?? new Date().toISOString());
      setObservabilityContext({
        lastCommandIntent: data.parsedIntent ?? null,
        lastCommandId: data.commandId ?? null,
        lastCommandSuccess: data.success ?? true,
      });
      const route = routeForIntent(data.parsedIntent);
      if (route && !isCommandCenterHome(pathname)) navigate(route);
    },
    onExecuteError: (msg) => {
      setError(msg);
    },
    onUndoSuccess: () => {
      setLastResult((prev) =>
        prev ? { ...prev, undoable: false, result: t('command.undo.reverted') } : prev,
      );
    },
    onUndoError: (msg) => {
      setError(msg);
    },
  });

  const executeCommand = useCallback(
    async (command: string): Promise<CommandResult> => {
      setError(null);
      return executeMutation.mutateAsync(command);
    },
    [executeMutation],
  );

  const undoLastCommand = useCallback(async () => {
    if (!lastResult?.commandId || !lastResult.undoable) return;
    setError(null);
    await undoMutation.mutateAsync(lastResult.commandId);
  }, [lastResult, undoMutation]);

  return (
    <CommandContext.Provider
      value={{
        executeCommand,
        undoLastCommand,
        lastResult,
        loading,
        streaming,
        streamSteps,
        streamPlan,
        streamActiveAgentKey: activeAgentKey,
        cancelStream,
        error,
        paletteOpen,
        openPalette,
        closePalette,
        history,
      }}
    >
      {children}
    </CommandContext.Provider>
  );
}

export function useCommand(): CommandContextValue {
  const ctx = useContext(CommandContext);
  if (!ctx) throw new Error('useCommand must be used within CommandProvider');
  return ctx;
}
