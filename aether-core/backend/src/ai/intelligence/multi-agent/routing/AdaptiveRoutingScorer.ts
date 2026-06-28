import type { ExecutionPlan, RouteDecision, SpecialistAgentDefinition } from '../types';
import type { AgentPerformanceSnapshot } from './AgentPerformancePort';

export const ADAPTIVE_MIN_SAMPLE = 5;

export class AdaptiveRoutingScorer {
  scoreAgent(
    candidate: { agentKey: string },
    performance: AgentPerformanceSnapshot[]
  ): number {
    const snap = performance.find((p) => p.agentKey === candidate.agentKey);
    if (!snap || snap.sampleSize < ADAPTIVE_MIN_SAMPLE) return 0.5;

    let score = snap.successRate;
    if (snap.recentFailures > 2) score -= 0.15;
    if (snap.avgLatencyMs != null && snap.avgLatencyMs > 30_000) score -= 0.05;
    return Math.max(0, Math.min(1, score));
  }

  rankAgents(
    candidates: Array<{ agentKey: string }>,
    performance: AgentPerformanceSnapshot[]
  ): Array<{ agentKey: string }> {
    return [...candidates].sort(
      (a, b) => this.scoreAgent(b, performance) - this.scoreAgent(a, performance)
    );
  }

  breakTieAmongAgents(
    candidates: SpecialistAgentDefinition[],
    performance: AgentPerformanceSnapshot[]
  ): SpecialistAgentDefinition | null {
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0]!;

    const hasData = performance.some((p) => p.sampleSize >= ADAPTIVE_MIN_SAMPLE);
    if (!hasData) return candidates[0]!;

    const ranked = this.rankAgents(
      candidates.map((c) => ({ agentKey: c.agentKey })),
      performance
    );
    const topKey = ranked[0]?.agentKey;
    return candidates.find((c) => c.agentKey === topKey) ?? candidates[0]!;
  }

  applyPlanWeights(
    plan: ExecutionPlan,
    performance: AgentPerformanceSnapshot[]
  ): ExecutionPlan {
    if (plan.agents.length <= 1) return plan;

    const hasData = performance.some((p) => p.sampleSize >= ADAPTIVE_MIN_SAMPLE);
    if (!hasData) return plan;

    const rankedKeys = this.rankAgents(plan.agents, performance).map((a) => a.agentKey);
    const agents = rankedKeys
      .map((key) => plan.agents.find((a) => a.agentKey === key))
      .filter((a): a is (typeof plan.agents)[number] => Boolean(a));

    const scores = Object.fromEntries(
      plan.agents.map((a) => [a.agentKey, this.scoreAgent(a, performance)])
    );

    return {
      ...plan,
      agents,
      routingReason: `${plan.routingReason ?? ''};adaptive`.replace(/^;/, ''),
      performanceScores: scores,
    };
  }

  boostRouteDecision(
    decision: RouteDecision,
    performance: AgentPerformanceSnapshot[]
  ): RouteDecision {
    if (!decision.agent || performance.length === 0) return decision;
    const score = this.scoreAgent({ agentKey: decision.agentKey! }, performance);
    return {
      ...decision,
      confidence: Math.min(1, decision.confidence + (score - 0.5) * 0.2),
      reason: `${decision.reason};perf:${score.toFixed(2)}`,
    };
  }
}
