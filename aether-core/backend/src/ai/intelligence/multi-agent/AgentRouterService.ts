import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import type { AgentRegistry } from './AgentRegistry';
import type { RouteDecision, SpecialistAgentDefinition } from './types';

function isLlmRoutingEnabled(): boolean {
  return process.env.MULTI_AGENT_LLM_ROUTING === 'true';
}

function llmMinConfidence(): number {
  const raw = process.env.MULTI_AGENT_LLM_ROUTING_MIN_CONFIDENCE;
  const n = raw ? Number(raw) : 0.65;
  return Number.isFinite(n) ? n : 0.65;
}

export class AgentRouterService {
  constructor(
    private registry: AgentRegistry,
    private llm: LlmInferencePort = defaultOllamaInference
  ) {}

  async route(input: {
    intent: string;
    command: string;
    confidence?: number;
  }): Promise<RouteDecision> {
    const intentMatch = this.registry.resolveByIntent(input.intent);
    if (intentMatch) {
      return {
        agent: intentMatch,
        agentKey: intentMatch.agentKey,
        confidence: 1,
        reason: `intent:${input.intent}`,
        source: 'intent',
      };
    }

    const keywordMatches = this.registry.resolveKeywordMatches(input.command);
    if (keywordMatches.length === 1) {
      const agent = keywordMatches[0];
      return {
        agent,
        agentKey: agent.agentKey,
        confidence: 0.85,
        reason: 'keyword match',
        source: 'keyword',
      };
    }

    const parseConfidence = input.confidence ?? 1;
    const needsLlm =
      isLlmRoutingEnabled() ||
      input.intent === 'UNKNOWN' ||
      parseConfidence < 0.6 ||
      keywordMatches.length > 1;

    if (needsLlm) {
      const llmDecision = await this.routeWithLlm(input.command, keywordMatches);
      if (llmDecision.agentKey && llmDecision.confidence >= llmMinConfidence()) {
        return llmDecision;
      }
    }

    return {
      agent: null,
      agentKey: null,
      confidence: 0,
      reason: 'no specialist match',
      source: 'none',
    };
  }

  private async routeWithLlm(
    command: string,
    candidates: SpecialistAgentDefinition[]
  ): Promise<RouteDecision> {
    const agents = candidates.length > 0 ? candidates : this.registry.list();
    if (agents.length === 0) {
      return { agent: null, agentKey: null, confidence: 0, reason: 'no agents', source: 'none' };
    }

    const catalog = agents
      .map(
        (a) =>
          `- ${a.agentKey}: ${a.displayName}; intents=[${a.supportedIntents.join(', ')}]; ${a.rolePrompt.slice(0, 120)}`
      )
      .join('\n');

    const prompt = `Kies de beste specialist agent voor dit merchant commando.

Agents:
${catalog}

Commando: "${command}"

Antwoord alleen JSON:
{ "agentKey": "<key or null>", "confidence": 0.0-1.0, "reason": "kort" }`;

    try {
      const text = await this.llm.generate({ prompt, temperature: 0.1 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { agent: null, agentKey: null, confidence: 0, reason: 'llm parse failed', source: 'none' };
      }
      const parsed = JSON.parse(jsonMatch[0]) as {
        agentKey?: string | null;
        confidence?: number;
        reason?: string;
      };
      const key = parsed.agentKey?.trim() || null;
      if (!key) {
        return {
          agent: null,
          agentKey: null,
          confidence: parsed.confidence ?? 0,
          reason: parsed.reason ?? 'llm: no agent',
          source: 'llm',
        };
      }
      const agent = this.registry.resolveByKey(key);
      return {
        agent,
        agentKey: agent?.agentKey ?? key,
        confidence: parsed.confidence ?? 0.7,
        reason: parsed.reason ?? 'llm routing',
        source: 'llm',
      };
    } catch {
      return { agent: null, agentKey: null, confidence: 0, reason: 'llm error', source: 'none' };
    }
  }
}
