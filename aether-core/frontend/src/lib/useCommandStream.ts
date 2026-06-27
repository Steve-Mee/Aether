import { useCallback, useRef, useState } from 'react';
import { env } from '@/lib/config';
import { apiStreamPostFetch } from '@/lib/api/client';
import { apiRoutes } from '@/lib/api/routes';
import type { AgentPlanStep, AgentStreamEvent, CommandResult } from '@/types/command';
import { t } from '@/lib/i18n';

export interface CommandStreamStep {
  id: string;
  label: string;
  summary: string;
  done: boolean;
  status?: 'ok' | 'error' | 'pending';
  checkpoint?: boolean;
}

export interface CommandStreamPlan {
  goal: string;
  steps: AgentPlanStep[];
  currentStep: number;
  stepTotal: number;
}

export function eventToStep(event: AgentStreamEvent, index: number): CommandStreamStep | null {
  switch (event.type) {
    case 'thinking':
      return {
        id: `thinking-${index}`,
        label: t('command.brain.thinking'),
        summary: event.narrative ?? '…',
        done: false,
        status: 'pending',
      };
    case 'plan_ready':
      return null;
    case 'plan_revised':
      return {
        id: `plan-revised-${event.revision ?? index}`,
        label: t('command.brain.planRevised'),
        summary: event.goal ?? '',
        done: false,
        status: 'pending',
      };
    case 'reflection':
      return {
        id: `reflection-${index}`,
        label: t('command.brain.reflection'),
        summary: (event.observation ?? '').slice(0, 120),
        done: true,
        status: 'ok',
      };
    case 'step_progress': {
      const label =
        event.steps?.[(event.planStep ?? 1) - 1]?.label ??
        `${t('command.brain.planStep')} ${event.planStep ?? ''}`;
      const done = event.stepStatus === 'done' || event.stepStatus === 'failed';
      return {
        id: `plan-step-${event.planStep ?? index}`,
        label,
        summary:
          event.stepStatus === 'failed'
            ? t('command.brain.stepFailed')
            : event.stepStatus === 'running'
              ? t('command.brain.stepRunning')
              : t('command.brain.stepDone'),
        done,
        status: event.stepStatus === 'failed' ? 'error' : done ? 'ok' : 'pending',
      };
    }
    case 'tool_start':
      return {
        id: `tool-${event.tool}-${index}`,
        label: event.tool ?? 'tool',
        summary: event.summary ?? '',
        done: false,
        status: 'pending',
      };
    case 'tool_result':
      return {
        id: `tool-result-${event.tool}-${index}`,
        label: event.tool ?? 'tool',
        summary: (event.output ?? '').slice(0, 120),
        done: true,
        status: 'ok',
      };
    case 'proposal_ready':
      return {
        id: `proposal-${event.proposalId}`,
        label: event.tool ?? 'proposal',
        summary: event.summary ?? '',
        done: false,
        status: 'pending',
      };
    case 'checkpoint':
      return {
        id: `checkpoint-${event.proposalId ?? index}`,
        label: t('command.brain.stepAwaitingApproval'),
        summary: event.summary ?? '',
        done: false,
        status: 'pending',
        checkpoint: true,
      };
    case 'narrative_delta':
      return {
        id: `narrative-${index}`,
        label: t('command.brain.stepAssistant'),
        summary: (event.narrative ?? '').slice(0, 120),
        done: true,
        status: 'ok',
      };
    case 'agent_assigned':
      return {
        id: `agent-${event.agentKey ?? index}`,
        label: t('command.brain.agentAssigned'),
        summary: event.agentKey ?? '',
        done: false,
        status: 'pending',
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
  const [streaming, setStreaming] = useState(false);
  const [activeAgentKey, setActiveAgentKey] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setSteps([]);
    setPlan(null);
    setStreaming(false);
    setActiveAgentKey(null);
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
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

              if (event.type === 'agent_assigned' && event.agentKey) {
                setActiveAgentKey(event.agentKey.split(',')[0] ?? event.agentKey);
              }

              if (event.type === 'plan_ready' && event.goal && event.steps) {
                setPlan({
                  goal: event.goal,
                  steps: event.steps,
                  currentStep: 0,
                  stepTotal: event.stepTotal ?? event.steps.length,
                });
              }

              if (event.type === 'plan_revised' && event.goal && event.steps) {
                setPlan({
                  goal: event.goal,
                  steps: event.steps,
                  currentStep: 0,
                  stepTotal: event.stepTotal ?? event.steps.length,
                });
              }

              if (event.type === 'step_progress' && event.planStep != null) {
                setPlan((prev) =>
                  prev
                    ? {
                        ...prev,
                        currentStep: event.planStep ?? prev.currentStep,
                        stepTotal: event.planStepTotal ?? prev.stepTotal,
                      }
                    : prev,
                );
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

  return { steps, plan, streaming, activeAgentKey, reset, cancel, executeWithStream };
}
