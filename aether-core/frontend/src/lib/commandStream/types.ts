import type { AgentPlanStep, HandoffChainEntry, SharedMemoryEntry } from '@/types/command';
import type { LiveExplainState } from '@/types/explainability';

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

export interface CommandStreamState {
  steps: CommandStreamStep[];
  plan: CommandStreamPlan | null;
  plansByAgent: Record<string, CommandStreamPlan>;
  activeAgentKeys: string[];
  handoffChain: HandoffChainEntry[];
  sharedMemory: SharedMemoryEntry[];
  executionMode: 'single' | 'sequential' | 'parallel' | null;
  chainFrom: string | null;
  cancelled: boolean;
  liveExplain: LiveExplainState | null;
  streamCommandId: string | null;
}

export function createInitialStreamState(): CommandStreamState {
  return {
    steps: [],
    plan: null,
    plansByAgent: {},
    activeAgentKeys: [],
    handoffChain: [],
    sharedMemory: [],
    executionMode: null,
    chainFrom: null,
    cancelled: false,
    liveExplain: null,
    streamCommandId: null,
  };
}
