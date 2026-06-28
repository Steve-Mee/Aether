import type { AgentPlan, AgentRunSummary } from '../../command-brain/types/AgentPlan';

export type ReflectionTrigger = 'multi_step' | 'high_impact' | 'failure' | 'manual';

export interface ExperienceReflection {
  goal: string;
  stepsTaken: string[];
  outcome: string;
  wentWell: string[];
  couldImprove: string[];
  futureLearnings: string[];
  trigger: ReflectionTrigger;
  success: boolean;
  intent: string;
  command: string;
  toolsUsed?: string[];
}

export interface ReflectionTriggerContext {
  intent: string;
  goalReached: boolean;
  toolsUsed: number;
  usedAgentLoop: boolean;
  checkpoint?: boolean;
}

export interface ReflectionInput {
  tenantId: string;
  command: string;
  intent: string;
  summary: AgentRunSummary;
  plan?: AgentPlan | null;
  toolTrace?: Array<{ tool: string; output?: string; status?: string }>;
  stepReflections?: string[];
  trigger: ReflectionTrigger;
  agentKey?: string;
}

export interface ExperienceReflectionResult {
  reflection: ExperienceReflection;
  memoryIds: string[];
}
