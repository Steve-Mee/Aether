import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../shared/ai/OllamaInferenceAdapter';
import {
  collaborationChainToExecutionPlan,
  detectMultiDomainPlan,
  resolveCollaborationChain,
  resolveMultiAgentKeywords,
} from './AgentCollaborationPolicy';
import type { AgentRegistry } from './AgentRegistry';
import { classifyMultiAgentMode } from './ExecutionModeClassifier';
import type { CollaborationPlannerService } from './CollaborationPlannerService';
import type { CollaborationGraphBuilder } from './graph/CollaborationGraphBuilder';
import { isGraphPeerEdgesEnabled } from './graph/types';
import { isAdaptiveRoutingEnabled } from './parallelConfig';
import type { AgentPerformancePort } from './routing/AgentPerformancePort';
import { AdaptiveRoutingScorer } from './routing/AdaptiveRoutingScorer';
import type { ExecutionPlan, ExecutionMode, RouteDecision, SpecialistAgentDefinition } from './types';
import { getAllowedDelegationTargets } from './delegationConfig';

function isLlmRoutingEnabled(): boolean {
  return process.env.MULTI_AGENT_LLM_ROUTING === 'true';
}

function llmMinConfidence(): number {
  const raw = process.env.MULTI_AGENT_LLM_ROUTING_MIN_CONFIDENCE;
  const n = raw ? Number(raw) : 0.65;
  return Number.isFinite(n) ? n : 0.65;
}

export class AgentRouterService {
  private routingScorer = new AdaptiveRoutingScorer();

  constructor(
    private registry: AgentRegistry,
    private llm: LlmInferencePort = defaultOllamaInference,
    private collaborationPlanner?: CollaborationPlannerService,
    private graphBuilder?: CollaborationGraphBuilder,
    private performancePort?: AgentPerformancePort
  ) {}

  async route(input: {
    tenantId?: string;
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

    if (
      keywordMatches.length > 1 &&
      isAdaptiveRoutingEnabled() &&
      this.performancePort &&
      input.tenantId
    ) {
      const performance = await this.performancePort.getTenantAgentScores(
        input.tenantId,
        keywordMatches.map((a) => a.agentKey)
      );
      const picked = this.routingScorer.breakTieAmongAgents(keywordMatches, performance);
      if (picked) {
        return {
          agent: picked,
          agentKey: picked.agentKey,
          confidence: 0.8,
          reason: 'keyword match (adaptive tie-break)',
          source: 'keyword',
        };
      }
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

  async routePlan(input: {
    tenantId?: string;
    intent: string;
    command: string;
    confidence?: number;
  }): Promise<ExecutionPlan> {
    const finalize = async (plan: ExecutionPlan) => {
      let weighted = plan;
      if (isAdaptiveRoutingEnabled() && this.performancePort && input.tenantId) {
        weighted = await this.applyPerformanceWeights(weighted, input.tenantId);
      }
      return this.attachGraphDefinition(weighted, input.command);
    };

    const collaborationChain = resolveCollaborationChain(
      input.command,
      input.intent,
      this.registry
    );

    if (collaborationChain && (collaborationChain.mode === 'sequential' || collaborationChain.mode === 'parallel')) {
      const plan = collaborationChainToExecutionPlan(collaborationChain);
      return await finalize({
        ...plan,
        routingSource: 'keyword',
        routingReason: `collaboration:${collaborationChain.ruleId}`,
      });
    }

    if (this.collaborationPlanner?.isEnabled()) {
      const llmPlan = await this.collaborationPlanner.plan(input);
      if (llmPlan && llmPlan.agents.length > 0) {
        return await finalize(this.collaborationPlanner.toExecutionPlan(llmPlan, input.command));
      }
    }

    const singleDecision = await this.route(input);
    const primaryAgentKey = singleDecision.agentKey ?? undefined;

    const prependChain = primaryAgentKey
      ? resolveCollaborationChain(input.command, input.intent, this.registry, primaryAgentKey)
      : null;

    if (prependChain && prependChain.mode === 'prepend') {
      const plan = collaborationChainToExecutionPlan(prependChain);
      return await finalize({
        ...plan,
        routingSource: singleDecision.source,
        routingReason: `collaboration:${prependChain.ruleId}`,
      });
    }

    const keywordAgents = resolveMultiAgentKeywords(input.command, this.registry);

    if (keywordAgents.length >= 2) {
      if (isLlmRoutingEnabled()) {
        const llmMultiPlan = await this.routeMultiWithLlm(input);
        if (llmMultiPlan && llmMultiPlan.agents.length > 1) {
          return await finalize(llmMultiPlan);
        }
      }

      const multiDomainPlan = detectMultiDomainPlan(
        input.command,
        input.intent,
        this.registry,
        primaryAgentKey
      );
      if (multiDomainPlan && multiDomainPlan.agents.length > 1) {
        return await finalize({
          ...multiDomainPlan,
          routingSource: singleDecision.source === 'none' ? 'keyword' : singleDecision.source,
          routingReason: multiDomainPlan.routingReason,
        });
      }
    }

    if (singleDecision.agent) {
      return await finalize({
        mode: 'single',
        agents: [{ agentKey: singleDecision.agentKey!, intent: input.intent }],
        routingSource: singleDecision.source,
        routingReason: singleDecision.reason,
      });
    }

    return await finalize({
      mode: 'single',
      agents: [],
      routingSource: singleDecision.source,
      routingReason: singleDecision.reason,
    });
  }

  private async applyPerformanceWeights(
    plan: ExecutionPlan,
    tenantId: string
  ): Promise<ExecutionPlan> {
    if (!this.performancePort || plan.agents.length === 0) return plan;
    const agentKeys = plan.agents.map((a) => a.agentKey);
    const performance = await this.performancePort.getTenantAgentScores(tenantId, agentKeys);
    return this.routingScorer.applyPlanWeights(plan, performance);
  }

  private attachGraphDefinition(plan: ExecutionPlan, command: string): ExecutionPlan {
    if (!isGraphPeerEdgesEnabled() || !this.graphBuilder || plan.agents.length === 0) {
      return plan;
    }
    const graphDefinition = this.graphBuilder.buildFromPlan(plan, command);
    return graphDefinition ? { ...plan, graphDefinition } : plan;
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

  private async routeMultiWithLlm(input: {
    intent: string;
    command: string;
    confidence?: number;
  }): Promise<ExecutionPlan | null> {
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

Regels:
- Max 3 agents
- Gebruik parallel alleen als ALLE stappen read-only zijn
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
        agents?: Array<{ agentKey?: string; intent?: string }>;
        confidence?: number;
        reason?: string;
      };

      if ((parsed.confidence ?? 0) < llmMinConfidence()) return null;

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
          return { agentKey: key, intent, command: input.command };
        })
        .filter((a): a is { agentKey: string; intent: string; command: string } => a !== null)
        .slice(0, 3);

      if (validatedAgents.length < 2) return null;

      let mode: ExecutionMode =
        parsed.mode === 'parallel' || parsed.mode === 'sequential' ? parsed.mode : 'sequential';
      if (mode === 'parallel') {
        const classified = classifyMultiAgentMode(validatedAgents);
        if (classified === 'sequential') mode = 'sequential';
      } else if (mode !== 'sequential') {
        mode = classifyMultiAgentMode(validatedAgents);
      }

      return {
        mode,
        agents: validatedAgents,
        routingSource: 'llm',
        routingReason: parsed.reason ?? 'llm multi-agent routing',
      };
    } catch {
      return null;
    }
  }
}
