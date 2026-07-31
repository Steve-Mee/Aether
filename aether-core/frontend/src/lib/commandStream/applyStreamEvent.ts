import type { AgentStreamEvent } from '@/types/command';
import { eventToStep } from './eventToStep';
import type { CommandStreamPlan, CommandStreamState, CommandStreamStep } from './types';

function upsertStep(steps: CommandStreamStep[], step: CommandStreamStep): CommandStreamStep[] {
  const existing = steps.findIndex((s) => s.id === step.id);
  if (existing >= 0) {
    const next = [...steps];
    next[existing] = step;
    return next;
  }
  return [...steps, step];
}

function planUpdater(
  prev: CommandStreamPlan | null,
  event: AgentStreamEvent,
): CommandStreamPlan | null {
  if (event.type !== 'step_progress' || event.planStep == null) return prev;
  return prev
    ? {
        ...prev,
        currentStep: event.planStep ?? prev.currentStep,
        stepTotal: event.planStepTotal ?? prev.stepTotal,
      }
    : prev;
}

function buildPlan(event: AgentStreamEvent): CommandStreamPlan | null {
  if (
    (event.type !== 'plan_ready' && event.type !== 'plan_revised') ||
    !event.goal ||
    !event.steps
  ) {
    return null;
  }
  return {
    goal: event.goal,
    steps: event.steps,
    currentStep: 0,
    stepTotal: event.stepTotal ?? event.steps.length,
  };
}

/** Pure reducer for SSE stream events (excluding terminal `result` capture in the read loop). */
export function applyStreamEvent(
  state: CommandStreamState,
  event: AgentStreamEvent,
  stepIndex: number,
): CommandStreamState {
  let next = { ...state };

  if (event.type === 'explain_update') {
    next.liveExplain = {
      summary: event.summary,
      sections: event.explainSections,
      flowGraph: event.flowGraph,
    };
    return next;
  }

  if (event.type === 'run_started' && event.commandId) {
    next.streamCommandId = event.commandId;
    return next;
  }

  if (event.type === 'done') {
    if (event.runStatus === 'cancelled') {
      next.cancelled = true;
    }
    return next;
  }

  if (event.type === 'agent_assigned' && event.agentKey) {
    next.activeAgentKeys = event.agentKey
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    if (event.executionMode) next.executionMode = event.executionMode;
  }

  if (event.type === 'agent_started' && event.agentKey) {
    next.activeAgentKeys = next.activeAgentKeys.includes(event.agentKey)
      ? next.activeAgentKeys
      : [...next.activeAgentKeys, event.agentKey];
    if (event.executionMode) next.executionMode = event.executionMode;
  }

  if (event.type === 'agent_completed' && event.agentKey) {
    next.activeAgentKeys = next.activeAgentKeys.filter((k) => k !== event.agentKey);
  }

  if (event.type === 'agent_handoff' && event.fromAgentKey && event.toAgentKey) {
    next.chainFrom = event.fromAgentKey;
    next.handoffChain = [
      ...next.handoffChain,
      {
        from: event.fromAgentKey,
        to: event.toAgentKey,
        reason: event.handoffReason ?? '',
        mode: 'sync',
        handoffMode: event.handoffMode,
      },
    ];
  }

  if (event.type === 'peer_job_queued' && event.fromAgentKey && event.toAgentKey) {
    next.handoffChain = [
      ...next.handoffChain,
      {
        from: event.fromAgentKey,
        to: event.toAgentKey,
        reason: event.handoffReason ?? 'async',
        mode: 'async',
        jobId: event.jobId,
        status: 'pending',
      },
    ];
  }

  if (event.type === 'peer_job_completed' && event.jobId) {
    next.handoffChain = next.handoffChain.map((e) =>
      e.jobId === event.jobId ? { ...e, status: 'completed', summary: event.summary } : e,
    );
  }

  if (event.type === 'peer_job_failed' && event.jobId) {
    next.handoffChain = next.handoffChain.map((e) =>
      e.jobId === event.jobId ? { ...e, status: 'failed', summary: event.error } : e,
    );
  }

  if (event.type === 'handoff_chain_update' && event.handoffChain) {
    next.handoffChain = event.handoffChain;
  }

  if (event.type === 'shared_memory_updated' && event.namespace && event.key) {
    const idx = next.sharedMemory.findIndex(
      (e) => e.namespace === event.namespace && e.key === event.key,
    );
    const nextEntry = {
      namespace: event.namespace,
      key: event.key,
      updatedByAgentKey: event.agentKey,
      updatedAt: event.timestamp,
      valuePreview: event.valuePreview,
    };
    if (idx >= 0) {
      const memory = [...next.sharedMemory];
      memory[idx] = { ...memory[idx], ...nextEntry };
      next.sharedMemory = memory;
    } else {
      next.sharedMemory = [...next.sharedMemory, nextEntry];
    }
  }

  if (event.type === 'result' && event.result?.brain?.executionMode) {
    next.executionMode = event.result.brain.executionMode;
  }
  if (event.type === 'result' && event.result?.brain?.handoffChain) {
    next.handoffChain = event.result.brain.handoffChain;
  }
  if (event.type === 'result' && event.result?.brain?.sharedMemorySummary) {
    const summary = event.result.brain.sharedMemorySummary;
    next.sharedMemory = Object.entries(summary).map(([key, value]) => ({
      namespace: 'shared',
      key,
      valuePreview: JSON.stringify(value).slice(0, 200),
    }));
  }

  const newPlan = buildPlan(event);
  if (newPlan) {
    if (event.agentKey) {
      next.plansByAgent = { ...next.plansByAgent, [event.agentKey]: newPlan };
    } else {
      next.plan = newPlan;
    }
  }

  if (event.type === 'step_progress') {
    if (event.agentKey) {
      const current = next.plansByAgent[event.agentKey] ?? null;
      const updated = planUpdater(current, event);
      if (updated) {
        next.plansByAgent = { ...next.plansByAgent, [event.agentKey]: updated };
      }
    } else {
      next.plan = planUpdater(next.plan, event);
    }
  }

  const step = eventToStep(event, stepIndex);
  if (step) {
    next.steps = upsertStep(next.steps, step);
  }

  return next;
}
