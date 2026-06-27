import type { PersonalBrainRegistry } from '../personal-brain/PersonalBrainRegistry';
import type { AgentPlan, AgentRunSummary } from './types/AgentPlan';
import type { BrainToolTraceEntry } from '../personal-brain/tools/types';
import { normalizeAgentPlan } from './types/AgentPlan';

export const AGENT_PLAN_INTENT = 'AGENT_PLAN';
export const AGENT_PLAN_PREFIX = '[AGENT_PLAN]';

export function isPlanMemoryEnabled(): boolean {
  return process.env.COMMAND_BRAIN_PLAN_MEMORY_ENABLED !== 'false';
}

export interface RememberPlanInput {
  command: string;
  plan: AgentPlan;
  summary?: AgentRunSummary;
  toolTrace?: BrainToolTraceEntry[];
}

export class PlanMemoryService {
  constructor(private personalBrains: PersonalBrainRegistry) {}

  async rememberPlan(tenantId: string, input: RememberPlanInput): Promise<string | undefined> {
    if (!isPlanMemoryEnabled()) return undefined;

    const brain = this.personalBrains.get(tenantId, 'admin');
    const payload = JSON.stringify({
      goal: input.plan.goal,
      steps: input.plan.steps,
      reasoning: input.plan.reasoning,
      success: input.summary?.goalReached ?? true,
      tools: input.toolTrace?.map((t) => t.tool) ?? [],
    });

    return brain.remember({
      command: input.command,
      intent: AGENT_PLAN_INTENT,
      result: payload,
    });
  }

  async recallSimilarPlans(tenantId: string, command: string, limit = 3): Promise<AgentPlan[]> {
    if (!isPlanMemoryEnabled()) return [];

    const brain = this.personalBrains.get(tenantId, 'admin');
    const recall = await brain.recall(`${AGENT_PLAN_PREFIX} ${command}`, limit * 3);

    const plans: AgentPlan[] = [];
    for (const snippet of recall.snippets) {
      if (!snippet.includes(`[${AGENT_PLAN_INTENT}]`)) continue;
      const plan = parsePlanFromSnippet(snippet);
      if (plan && plans.length < limit) {
        plans.push(plan);
      }
    }
    return plans;
  }
}

function parsePlanFromSnippet(snippet: string): AgentPlan | null {
  const arrowIdx = snippet.indexOf('→');
  if (arrowIdx < 0) return null;
  const resultPart = snippet.slice(arrowIdx + 1).trim();
  try {
    const parsed = JSON.parse(resultPart) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    if (obj.success === false) return null;
    return normalizeAgentPlan(
      { goal: obj.goal, steps: obj.steps, reasoning: obj.reasoning },
      typeof obj.goal === 'string' ? obj.goal : 'Plan'
    );
  } catch {
    return null;
  }
}
