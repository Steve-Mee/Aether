import { useCallback, useRef, useState } from 'react';
import { env } from '@/lib/config';
import { apiStreamPostFetch } from '@/lib/api/client';
import { apiRoutes } from '@/lib/api/routes';
import { commandsApi } from '@/features/commands/api';
import { applyStreamEvent } from '@/lib/commandStream/applyStreamEvent';
import { eventToStep } from '@/lib/commandStream/eventToStep';
import {
  createInitialStreamState,
  type CommandStreamPlan,
  type CommandStreamState,
  type CommandStreamStep,
} from '@/lib/commandStream/types';
import type { AgentStreamEvent, CommandResult } from '@/types/command';

export type { CommandStreamStep, CommandStreamPlan } from '@/lib/commandStream/types';
export { eventToStep } from '@/lib/commandStream/eventToStep';

function syncStreamState(
  state: CommandStreamState,
  setters: {
    setSteps: (v: CommandStreamStep[]) => void;
    setPlan: (v: CommandStreamPlan | null) => void;
    setPlansByAgent: (v: Record<string, CommandStreamPlan>) => void;
    setActiveAgentKeys: (v: string[]) => void;
    setHandoffChain: (v: CommandStreamState['handoffChain']) => void;
    setSharedMemory: (v: CommandStreamState['sharedMemory']) => void;
    setExecutionMode: (v: CommandStreamState['executionMode']) => void;
    setChainFrom: (v: string | null) => void;
    setCancelled: (v: boolean) => void;
    setLiveExplain: (v: CommandStreamState['liveExplain']) => void;
  },
  streamCommandIdRef: React.MutableRefObject<string | null>,
) {
  setters.setSteps(state.steps);
  setters.setPlan(state.plan);
  setters.setPlansByAgent(state.plansByAgent);
  setters.setActiveAgentKeys(state.activeAgentKeys);
  setters.setHandoffChain(state.handoffChain);
  setters.setSharedMemory(state.sharedMemory);
  setters.setExecutionMode(state.executionMode);
  setters.setChainFrom(state.chainFrom);
  setters.setCancelled(state.cancelled);
  setters.setLiveExplain(state.liveExplain);
  streamCommandIdRef.current = state.streamCommandId;
}

/**
 * Execute a command via SSE when streaming is enabled on the backend.
 * Falls back to null so callers can use the regular POST path.
 */
export function useCommandStream() {
  const [steps, setSteps] = useState<CommandStreamStep[]>([]);
  const [plan, setPlan] = useState<CommandStreamPlan | null>(null);
  const [plansByAgent, setPlansByAgent] = useState<Record<string, CommandStreamPlan>>({});
  const [streaming, setStreaming] = useState(false);
  const [activeAgentKeys, setActiveAgentKeys] = useState<string[]>([]);
  const [handoffChain, setHandoffChain] = useState<CommandStreamState['handoffChain']>([]);
  const [sharedMemory, setSharedMemory] = useState<CommandStreamState['sharedMemory']>([]);
  const [executionMode, setExecutionMode] = useState<CommandStreamState['executionMode']>(null);
  const [chainFrom, setChainFrom] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const [liveExplain, setLiveExplain] = useState<CommandStreamState['liveExplain']>(null);
  const [executingProactiveId, setExecutingProactiveId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const streamCommandIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setSteps([]);
    setPlan(null);
    setPlansByAgent({});
    setStreaming(false);
    setActiveAgentKeys([]);
    setHandoffChain([]);
    setSharedMemory([]);
    setExecutionMode(null);
    setChainFrom(null);
    setCancelled(false);
    setLiveExplain(null);
    setExecutingProactiveId(null);
    streamCommandIdRef.current = null;
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    const commandId = streamCommandIdRef.current;
    if (commandId) {
      void commandsApi.cancelAgentRun(commandId).catch(() => undefined);
    }
    setCancelled(true);
  }, []);

  const executeWithStream = useCallback(
    async (command: string): Promise<CommandResult | null> => {
      if (env.isMockMode) return null;

      reset();
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      try {
        const response = await apiStreamPostFetch(
          apiRoutes.admin.command,
          { command: command.trim() },
          controller.signal,
        );

        if (!response.ok || !response.body) {
          setStreaming(false);
          return null;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: CommandResult | null = null;
        let streamState = createInitialStreamState();
        let stepIndex = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;
            try {
              const event = JSON.parse(line.slice(5).trim()) as AgentStreamEvent;
              if (event.type === 'result' && event.result) {
                finalResult = event.result;
                continue;
              }

              streamState = applyStreamEvent(streamState, event, stepIndex);
              if (eventToStep(event, stepIndex)) stepIndex += 1;

              syncStreamState(
                streamState,
                {
                  setSteps,
                  setPlan,
                  setPlansByAgent,
                  setActiveAgentKeys,
                  setHandoffChain,
                  setSharedMemory,
                  setExecutionMode,
                  setChainFrom,
                  setCancelled,
                  setLiveExplain,
                },
                streamCommandIdRef,
              );

              if (event.type === 'done' && event.runStatus === 'cancelled') {
                setStreaming(false);
              }
            } catch {
              /* ignore malformed chunk */
            }
          }
        }

        setStreaming(false);
        return finalResult;
      } catch {
        setStreaming(false);
        return null;
      }
    },
    [reset],
  );

  const executeProactiveWithStream = useCallback(
    async (suggestionId: string): Promise<CommandResult | null> => {
      if (env.isMockMode) return null;

      reset();
      setExecutingProactiveId(suggestionId);
      const controller = new AbortController();
      abortRef.current = controller;
      setStreaming(true);

      try {
        const response = await apiStreamPostFetch(
          apiRoutes.admin.proactiveSuggestionExecute(suggestionId),
          {},
          controller.signal,
        );

        if (!response.ok || !response.body) {
          setStreaming(false);
          setExecutingProactiveId(null);
          return null;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: CommandResult | null = null;
        let streamState = createInitialStreamState();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';

          for (const part of parts) {
            const line = part.split('\n').find((l) => l.startsWith('data:'));
            if (!line) continue;
            try {
              const event = JSON.parse(line.slice(5).trim()) as AgentStreamEvent;
              if (event.type === 'result' && event.result) {
                finalResult = event.result;
                continue;
              }
              streamState = applyStreamEvent(streamState, event, 0);
              syncStreamState(
                streamState,
                {
                  setSteps,
                  setPlan,
                  setPlansByAgent,
                  setActiveAgentKeys,
                  setHandoffChain,
                  setSharedMemory,
                  setExecutionMode,
                  setChainFrom,
                  setCancelled,
                  setLiveExplain,
                },
                streamCommandIdRef,
              );
            } catch {
              /* ignore malformed chunk */
            }
          }
        }

        setStreaming(false);
        setExecutingProactiveId(null);
        return finalResult;
      } catch {
        setStreaming(false);
        setExecutingProactiveId(null);
        return null;
      }
    },
    [reset],
  );

  return {
    steps,
    plan,
    plansByAgent,
    streaming,
    activeAgentKey: activeAgentKeys[0] ?? null,
    activeAgentKeys,
    handoffChain,
    sharedMemory,
    executionMode,
    chainFrom,
    cancelled,
    liveExplain,
    executingProactiveId,
    reset,
    cancel,
    executeWithStream,
    executeProactiveWithStream,
  };
}
