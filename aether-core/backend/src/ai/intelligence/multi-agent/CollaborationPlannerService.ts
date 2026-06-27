import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import { isMutatingIntent } from '../command-brain/BrainActionPolicyResolver';
import type { AgentRegistry } from './AgentRegistry';
import { classifyMultiAgentMode } from './ExecutionModeClassifier';
import { getAllowedDelegationTargets } from './delegationConfig';
import type { ExecutionMode, ExecutionPlan } from './types';

export interface CollaborationPlanInput {
  intent: string;
  command: string;
  confidence?: number;
}

export interface CollaborationPlanAgent {
  agentKey: string;
  intent: string;
  reason: string;
}

export interface CollaborationPlan {
  mode: ExecutionMode;
  agents: CollaborationPlanAgent[];
  confidence: number;
  source: 'llm' | 'rules';
  reason: string;
}

export function isLlmCollaborationPlanningEnabled(): boolean {
  if (process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING === 'false') return false;
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.MULTI_AGENT_LLM_COLLABORATION_PLANNING !== 'true'
  ) {
    return false;
  }
  return true;
}

function llmPlanMinConfidence(): number {
  const raw = process.env.MULTI_AGENT_LLM_PLAN_MIN_CONFIDENCE;
  const n = raw ? Number(raw) : 0.65;
  return Number.isFinite(n) ? n : 0.65;
}

export class CollaborationPlannerService {
  constructor(
    private registry: AgentRegistry,
    private llm: LlmInferencePort = defaultOllamaInference
  ) {}

  isEnabled(): boolean {
    return isLlmCollaborationPlanningEnabled();
  }

  async plan(input: CollaborationPlanInput): Promise<CollaborationPlan | null> {
    if (!this.isEnabled()) return null;

    const allowed = getAllowedDelegationTargets();
    const agents = this.registry.list().filter((a) => allowed.has(a.agentKey));
    if (agents.length === 0) return null;

    const catalog = agents
      .map(
        (a) =>
          `- ${a.agentKey}: ${a.displayName}; intents=[${a.supportedIntents.join(', ')}]; ${a.rolePrompt.slice(0, 100)}`
      )
      .join('\n');

    const prompt = `Plan welke specialist agents dit merchant commando moeten uitvoeren.

Agents (alleen deze keys gebruiken):
${catalog}

Commando: "${input.command}"
Parsed intent: ${input.intent}
Parse confidence: ${input.confidence ?? 1}

Regels:
- Max 3 agents
- Gebruik parallel alleen als ALLE stappen read-only zijn (geen PRICE_UPDATE, RESTOCK_SUGGEST, SUPPLIER_CREATE, etc.)
- Gebruik sequential als output van agent A input is voor agent B

Antwoord alleen JSON:
{
  "mode": "single" | "sequential" | "parallel",
  "agents": [{ "agentKey": "<key>", "intent": "<intent>", "reason": "kort" }],
  "confidence": 0.0-1.0,
  "reason": "kort"
}`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.1 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]) as {
        mode?: string;
        agents?: Array<{ agentKey?: string; intent?: string; reason?: string }>;
        confidence?: number;
        reason?: string;
      };

      const confidence = parsed.confidence ?? 0;
      if (confidence < llmPlanMinConfidence()) return null;

      const validatedAgents = (parsed.agents ?? [])
        .map((a) => {
          const key = a.agentKey?.trim();
          if (!key || !allowed.has(key)) return null;
          const def = this.registry.resolveByKey(key);
          if (!def) return null;
          const intent =
            a.intent && def.supportedIntents.includes(a.intent)
              ? a.intent
              : def.supportedIntents[0] ?? input.intent;
          return {
            agentKey: key,
            intent,
            reason: a.reason ?? 'llm plan',
          };
        })
        .filter((a): a is CollaborationPlanAgent => a !== null)
        .slice(0, 3);

      if (validatedAgents.length === 0) return null;

      let mode: ExecutionMode =
        parsed.mode === 'parallel' || parsed.mode === 'sequential' ? parsed.mode : 'single';

      if (validatedAgents.length === 1) {
        mode = 'single';
      } else if (mode === 'parallel') {
        const classified = classifyMultiAgentMode(validatedAgents);
        if (classified === 'sequential') mode = 'sequential';
      } else if (mode === 'single' && validatedAgents.length > 1) {
        mode = classifyMultiAgentMode(validatedAgents);
      }

      return {
        mode,
        agents: validatedAgents,
        confidence,
        source: 'llm',
        reason: parsed.reason ?? 'llm collaboration plan',
      };
    } catch {
      return null;
    }
  }

  toExecutionPlan(plan: CollaborationPlan, command: string): ExecutionPlan {
    if (plan.mode === 'single' || plan.agents.length === 1) {
      const first = plan.agents[0];
      return {
        mode: 'single',
        agents: first ? [{ agentKey: first.agentKey, intent: first.intent, command }] : [],
        routingSource: 'llm-plan',
        routingReason: plan.reason,
      };
    }

    return {
      mode: plan.mode === 'parallel' ? 'parallel' : 'sequential',
      agents: plan.agents.map((a) => ({
        agentKey: a.agentKey,
        intent: a.intent,
        command,
      })),
      routingSource: 'llm-plan',
      routingReason: plan.reason,
    };
  }
}

export function planHasMutatingAgents(agents: CollaborationPlanAgent[]): boolean {
  return agents.some((a) => isMutatingIntent(a.intent));
}
