import { useCallback, useRef, useState } from 'react';
import { env } from '@/lib/config';
import { apiStreamPostFetch } from '@/lib/api/client';
import { apiRoutes } from '@/lib/api/routes';
import { commandsApi } from '@/features/commands/api';
import { agentDisplayLabel, agentHandoffLabel, agentWorkingLabel, formatAgentKeysLabel } from '@/lib/agentDisplay';
import type { AgentPlanStep, AgentStreamEvent, CommandResult, HandoffChainEntry } from '@/types/command';
import { t } from '@/lib/i18n';
import { humanizeHandoffReason } from '@/lib/agentDisplay';

export interface CommandStreamStep {
  id: string;
  label: string;
  summary: string;
  done: boolean;
  status?: 'ok' | 'error' | 'pending';
  checkpoint?: boolean;
  agentKey?: string;
}

export interface CommandStreamPlan {
  goal: string;
  steps: AgentPlanStep[];
  currentStep: number;
  stepTotal: number;
}

export function eventToStep(event: AgentStreamEvent, index: number): CommandStreamStep | null {
  const agentPrefix = event.agentKey ? `${event.agentKey}-` : '';
  const agentKey = event.agentKey;

  switch (event.type) {
    case 'thinking':
      return {
        id: `${agentPrefix}thinking-${index}`,
        label: t('command.brain.thinking'),
        summary: event.narrative ?? '…',
        done: false,
        status: 'pending',
        agentKey,
      };
    case 'plan_ready':
      return null;
    case 'plan_revised':
      return {
        id: `${agentPrefix}plan-revised-${event.revision ?? index}`,
        label: t('command.brain.planRevised'),
        summary: event.goal ?? '',
        done: false,
        status: 'pending',
        agentKey,
      };
    case 'reflection':
      return {
        id: `${agentPrefix}reflection-${index}`,
        label: t('command.brain.reflection'),
        summary: (event.observation ?? '').slice(0, 120),
        done: true,
        status: 'ok',
        agentKey,
      };
    case 'step_progress': {
      const label =
        event.steps?.[(event.planStep ?? 1) - 1]?.label ??
        `${t('command.brain.planStep')} ${event.planStep ?? ''}`;
      const done = event.stepStatus === 'done' || event.stepStatus === 'failed';
      return {
        id: `${agentPrefix}plan-step-${event.planStep ?? index}`,
        label,
        summary:
          event.stepStatus === 'failed'
            ? t('command.brain.stepFailed')
            : event.stepStatus === 'running'
              ? t('command.brain.stepRunning')
              : t('command.brain.stepDone'),
        done,
        status: event.stepStatus === 'failed' ? 'error' : done ? 'ok' : 'pending',
        agentKey,
      };
    }
    case 'tool_start':
      return {
        id: `${agentPrefix}tool-${event.tool}-${index}`,
        label: event.tool ?? 'tool',
        summary: event.summary ?? '',
        done: false,
        status: 'pending',
        agentKey,
      };
    case 'tool_result':
      return {
        id: `${agentPrefix}tool-result-${event.tool}-${index}`,
        label: event.tool ?? 'tool',
        summary: (event.output ?? '').slice(0, 120),
        done: true,
        status: 'ok',
        agentKey,
      };
    case 'proposal_ready':
      return {
        id: `${agentPrefix}proposal-${event.proposalId}`,
        label: event.tool ?? 'proposal',
        summary: event.summary ?? '',
        done: false,
        status: 'pending',
        agentKey,
      };
    case 'checkpoint':
      return {
        id: `${agentPrefix}checkpoint-${event.proposalId ?? index}`,
        label: t('command.brain.stepAwaitingApproval'),
        summary: event.summary ?? '',
        done: false,
        status: 'pending',
        checkpoint: true,
        agentKey,
      };
    case 'narrative_delta':
      return {
        id: `${agentPrefix}narrative-${index}`,
        label: t('command.brain.stepAssistant'),
        summary: (event.narrative ?? '').slice(0, 120),
        done: true,
        status: 'ok',
        agentKey,
      };
    case 'agent_assigned': {
      const keys = event.agentKey ?? '';
      const label = agentWorkingLabel(keys, t('command.brain.agentWorkingSuffix'));
      return {
        id: `agent-${keys || index}`,
        label,
        summary: keys.includes(',') ? formatAgentKeysLabel(keys) : agentDisplayLabel(keys),
        done: false,
        status: 'pending',
      };
    }
    case 'agent_started':
      return {
        id: `agent-start-${event.agentKey}-${index}`,
        label: agentWorkingLabel(event.agentKey ?? '', t('command.brain.agentWorkingSuffix')),
        summary: agentDisplayLabel(event.agentKey ?? ''),
        done: false,
        status: 'pending',
        agentKey: event.agentKey,
      };
    case 'agent_completed':
      return {
        id: `agent-done-${event.agentKey}-${index}`,
        label: `${agentDisplayLabel(event.agentKey ?? '')} ✓`,
        summary: event.error ?? event.summary ?? t('command.brain.stepDone'),
        done: true,
        status: event.error ? 'error' : 'ok',
        agentKey: event.agentKey,
      };
    case 'agent_handoff':
      return {
        id: `handoff-${event.fromAgentKey}-${event.toAgentKey}-${index}`,
        label: agentHandoffLabel(
          event.fromAgentKey ?? '',
          event.toAgentKey ?? '',
          t('command.brain.agentHandoffArrow'),
        ),
        summary: humanizeHandoffReason(event.handoffReason ?? ''),
        done: true,
        status: 'ok',
      };
    case 'peer_job_queued':
      return {
        id: `peer-queued-${event.jobId ?? index}`,
        label: agentHandoffLabel(
          event.fromAgentKey ?? '',
          event.toAgentKey ?? '',
          t('command.brain.agentHandoffArrow'),
        ),
        summary: t('command.brain.asyncPeerQueued'),
        done: false,
        status: 'pending',
      };
    case 'peer_job_completed':
      return {
        id: `peer-done-${event.jobId ?? index}`,
        label: t('command.brain.asyncPeerCompleted'),
        summary: event.summary ?? '',
        done: true,
        status: 'ok',
      };
    case 'peer_job_failed':
      return {
        id: `peer-fail-${event.jobId ?? index}`,
        label: t('command.brain.asyncPeerFailed'),
        summary: event.error ?? '',
        done: true,
        status: 'error',
      };
    case 'error':
      return {
        id: `error-${index}`,
        label: 'error',
        summary: event.error ?? 'Error',
        done: true,
        status: 'error',
      };
    default:
      return null;
  }
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
  const [handoffChain, setHandoffChain] = useState<HandoffChainEntry[]>([]);
  const [executionMode, setExecutionMode] = useState<'single' | 'sequential' | 'parallel' | null>(
    null,
  );
  const [chainFrom, setChainFrom] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const streamCommandIdRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    setSteps([]);
    setPlan(null);
    setPlansByAgent({});
    setStreaming(false);
    setActiveAgentKeys([]);
    setHandoffChain([]);
    setExecutionMode(null);
    setChainFrom(null);
    setCancelled(false);
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

              if (event.type === 'run_started' && event.commandId) {
                streamCommandIdRef.current = event.commandId;
              }

              if (event.type === 'done') {
                if (event.runStatus === 'cancelled') {
                  setCancelled(true);
                  setStreaming(false);
                }
                continue;
              }

              if (event.type === 'agent_assigned' && event.agentKey) {
                const keys = event.agentKey.split(',').map((k) => k.trim()).filter(Boolean);
                setActiveAgentKeys(keys);
                if (event.executionMode) {
                  setExecutionMode(event.executionMode);
                }
              }

              if (event.type === 'agent_started' && event.agentKey) {
                setActiveAgentKeys((prev) =>
                  prev.includes(event.agentKey!) ? prev : [...prev, event.agentKey!],
                );
                if (event.executionMode) {
                  setExecutionMode(event.executionMode);
                }
              }

              if (event.type === 'agent_completed' && event.agentKey) {
                setActiveAgentKeys((prev) => prev.filter((k) => k !== event.agentKey));
              }

              if (event.type === 'agent_handoff' && event.fromAgentKey && event.toAgentKey) {
                setChainFrom(event.fromAgentKey);
                setHandoffChain((prev) => [
                  ...prev,
                  {
                    from: event.fromAgentKey!,
                    to: event.toAgentKey!,
                    reason: event.handoffReason ?? '',
                    mode: 'sync',
                    handoffMode: event.handoffMode,
                  },
                ]);
              }

              if (event.type === 'peer_job_queued' && event.fromAgentKey && event.toAgentKey) {
                setHandoffChain((prev) => [
                  ...prev,
                  {
                    from: event.fromAgentKey!,
                    to: event.toAgentKey!,
                    reason: event.handoffReason ?? 'async',
                    mode: 'async',
                    jobId: event.jobId,
                    status: 'pending',
                  },
                ]);
              }

              if (event.type === 'peer_job_completed' && event.jobId) {
                setHandoffChain((prev) =>
                  prev.map((e) =>
                    e.jobId === event.jobId
                      ? { ...e, status: 'completed', summary: event.summary }
                      : e,
                  ),
                );
              }

              if (event.type === 'peer_job_failed' && event.jobId) {
                setHandoffChain((prev) =>
                  prev.map((e) =>
                    e.jobId === event.jobId
                      ? { ...e, status: 'failed', summary: event.error }
                      : e,
                  ),
                );
              }

              if (event.type === 'handoff_chain_update' && event.handoffChain) {
                setHandoffChain(event.handoffChain);
              }

              if (event.type === 'result' && event.result?.brain?.executionMode) {
                setExecutionMode(event.result.brain.executionMode);
              }
              if (event.type === 'result' && event.result?.brain?.handoffChain) {
                setHandoffChain(event.result.brain.handoffChain);
              }

              if (event.type === 'plan_ready' && event.goal && event.steps) {
                const nextPlan = {
                  goal: event.goal,
                  steps: event.steps,
                  currentStep: 0,
                  stepTotal: event.stepTotal ?? event.steps.length,
                };
                if (event.agentKey) {
                  setPlansByAgent((prev) => ({ ...prev, [event.agentKey!]: nextPlan }));
                } else {
                  setPlan(nextPlan);
                }
              }

              if (event.type === 'plan_revised' && event.goal && event.steps) {
                const nextPlan = {
                  goal: event.goal,
                  steps: event.steps,
                  currentStep: 0,
                  stepTotal: event.stepTotal ?? event.steps.length,
                };
                if (event.agentKey) {
                  setPlansByAgent((prev) => ({ ...prev, [event.agentKey!]: nextPlan }));
                } else {
                  setPlan(nextPlan);
                }
              }

              if (event.type === 'step_progress' && event.planStep != null) {
                const updater = (prev: CommandStreamPlan | null) =>
                  prev
                    ? {
                        ...prev,
                        currentStep: event.planStep ?? prev.currentStep,
                        stepTotal: event.planStepTotal ?? prev.stepTotal,
                      }
                    : prev;
                if (event.agentKey) {
                  setPlansByAgent((prev) => {
                    const current = prev[event.agentKey!];
                    const updated = updater(current ?? null);
                    return updated ? { ...prev, [event.agentKey!]: updated } : prev;
                  });
                } else {
                  setPlan(updater);
                }
              }

              const step = eventToStep(event, stepIndex++);
              if (step) {
                setSteps((prev) => {
                  const existing = prev.findIndex((s) => s.id === step.id);
                  if (existing >= 0) {
                    const next = [...prev];
                    next[existing] = step;
                    return next;
                  }
                  return [...prev, step];
                });
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

  return {
    steps,
    plan,
    plansByAgent,
    streaming,
    activeAgentKey: activeAgentKeys[0] ?? null,
    activeAgentKeys,
    handoffChain,
    executionMode,
    chainFrom,
    cancelled,
    reset,
    cancel,
    executeWithStream,
  };
}
