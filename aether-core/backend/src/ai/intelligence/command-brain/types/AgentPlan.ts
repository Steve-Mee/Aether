export type AgentPlanRiskHint = 'low' | 'medium' | 'high';

export interface AgentPlanStep {
  index: number;
  label: string;
  toolHint?: string;
  riskHint?: AgentPlanRiskHint;
}

export interface AgentPlan {
  goal: string;
  steps: AgentPlanStep[];
  reasoning?: string;
  revision?: number;
  supersedes?: string;
}

export const MAX_PLAN_STEPS = 5;

export function isPlanningEnabled(): boolean {
  return process.env.COMMAND_BRAIN_PLANNING_ENABLED !== 'false';
}

export function normalizeAgentPlan(raw: unknown, fallbackGoal: string): AgentPlan {
  if (!raw || typeof raw !== 'object') {
    return singleStepPlan(fallbackGoal);
  }
  const obj = raw as Record<string, unknown>;
  const goal = typeof obj.goal === 'string' && obj.goal.trim() ? obj.goal.trim() : fallbackGoal;
  const reasoning = typeof obj.reasoning === 'string' ? obj.reasoning.trim() : undefined;
  const stepsRaw = Array.isArray(obj.steps) ? obj.steps : [];

  const steps: AgentPlanStep[] = [];
  for (let i = 0; i < Math.min(stepsRaw.length, MAX_PLAN_STEPS); i++) {
    const s = stepsRaw[i];
    if (!s || typeof s !== 'object') continue;
    const step = s as Record<string, unknown>;
    const label = typeof step.label === 'string' ? step.label.trim() : '';
    if (!label) continue;
    const toolHint = typeof step.toolHint === 'string' ? step.toolHint.trim() : undefined;
    const riskHint =
      step.riskHint === 'low' || step.riskHint === 'medium' || step.riskHint === 'high'
        ? step.riskHint
        : undefined;
    steps.push({
      index: steps.length + 1,
      label,
      toolHint,
      riskHint,
    });
  }

  if (steps.length === 0) {
    return singleStepPlan(goal);
  }

  return { goal, steps, reasoning };
}

export function singleStepPlan(goal: string): AgentPlan {
  return {
    goal,
    steps: [{ index: 1, label: goal, riskHint: 'low' }],
  };
}

export interface AgentRunSummary {
  goalReached: boolean;
  completedSteps: Array<{ label: string; tool?: string }>;
  failedSteps: Array<{ label: string; error?: string }>;
  pendingApprovals: number;
  narrative: string;
  reflections?: string[];
  planRevisions?: number;
}

export function buildAgentRunSummary(params: {
  plan: AgentPlan | null;
  toolTrace: Array<{ tool: string; status?: string }>;
  pendingActions: Array<{ summary: string }>;
  narrative: string;
  goalReached: boolean;
  failedPlanSteps?: Array<{ label: string; error?: string }>;
  reflections?: string[];
  planRevisions?: number;
}): AgentRunSummary {
  const completedSteps = params.plan
    ? params.plan.steps
        .slice(0, params.toolTrace.length)
        .map((s, i) => ({ label: s.label, tool: params.toolTrace[i]?.tool }))
    : params.toolTrace.map((t) => ({ label: t.tool, tool: t.tool }));

  return {
    goalReached: params.goalReached,
    completedSteps,
    failedSteps: params.failedPlanSteps ?? [],
    pendingApprovals: params.pendingActions.length,
    narrative: params.narrative,
    reflections: params.reflections,
    planRevisions: params.planRevisions,
  };
}
