import type { LongTermMemoryStore } from './LongTermMemoryStore';
import { MEMORY_KIND_PLAN } from './constants';

export interface StrategyMemoryInput {
  tenantId: string;
  agentKey?: string;
  strategy: string;
  context: string;
  outcome: 'success' | 'failure' | 'mixed';
  impact?: 'high' | 'medium' | 'low';
  goalContext?: string;
  patterns?: string[];
}

export interface HighImpactActionInput {
  tenantId: string;
  agentKey?: string;
  action: string;
  goal: string;
  impact: number;
  success: boolean;
  context?: string;
}

export interface MerchantPatternInput {
  tenantId: string;
  agentKey?: string;
  pattern: string;
  category: 'behavior' | 'preference' | 'constraint' | 'goal';
  confidence: number;
  observations: string[];
}

export interface StrategyRecall {
  id: string;
  strategy: string;
  context: string;
  outcome: string;
  impact?: string;
  timestamp?: string;
  score: number;
}

export function isStrategicMemoryEnabled(): boolean {
  return process.env.PERSONAL_BRAIN_STRATEGIC_MEMORY_ENABLED !== 'false';
}

/**
 * Strategic memory layer for PersonalBrain.
 * Stores and recalls:
 * - Strategies that worked well
 * - High-impact actions on goals
 * - Merchant behavior patterns
 */
export class StrategicMemoryService {
  constructor(private longTerm: LongTermMemoryStore) {}

  async rememberStrategy(input: StrategyMemoryInput): Promise<string | undefined> {
    if (!isStrategicMemoryEnabled()) return undefined;

    const summary = this.formatStrategySummary(input);
    const priority = this.resolvePriority(input.outcome, input.impact);

    return this.longTerm.store({
      tenantId: input.tenantId,
      agentKey: input.agentKey,
      command: `Strategy: ${input.context.slice(0, 80)}`,
      intent: 'STRATEGY',
      summary,
      priority,
      memoryKind: MEMORY_KIND_PLAN,
      lessonLearned: input.outcome === 'success',
    });
  }

  async rememberHighImpactAction(input: HighImpactActionInput): Promise<string | undefined> {
    if (!isStrategicMemoryEnabled()) return undefined;

    const summary = this.formatActionSummary(input);
    const priority = input.impact >= 0.7 ? 'high' : input.impact >= 0.4 ? 'medium' : 'low';

    return this.longTerm.store({
      tenantId: input.tenantId,
      agentKey: input.agentKey,
      command: `High impact: ${input.goal.slice(0, 60)}`,
      intent: 'HIGH_IMPACT',
      summary,
      priority,
      memoryKind: MEMORY_KIND_PLAN,
      lessonLearned: input.success && input.impact >= 0.6,
      outcomeMetrics: { uplift: input.impact },
    });
  }

  async rememberMerchantPattern(input: MerchantPatternInput): Promise<string | undefined> {
    if (!isStrategicMemoryEnabled()) return undefined;

    const summary = this.formatPatternSummary(input);
    const priority = input.confidence >= 0.8 ? 'high' : input.confidence >= 0.5 ? 'medium' : 'low';

    return this.longTerm.store({
      tenantId: input.tenantId,
      agentKey: input.agentKey,
      command: `Pattern: ${input.category}`,
      intent: 'MERCHANT_PATTERN',
      summary,
      priority,
      memoryKind: MEMORY_KIND_PLAN,
      lessonLearned: input.confidence >= 0.7,
    });
  }

  async recallStrategies(
    tenantId: string,
    context: string,
    limit = 3,
    agentKey?: string
  ): Promise<StrategyRecall[]> {
    if (!isStrategicMemoryEnabled()) return [];

    const recalled = await this.longTerm.recall(
      tenantId,
      `Strategy: ${context}`,
      limit,
      [MEMORY_KIND_PLAN],
      agentKey
    );

    return recalled
      .filter((m) => m.summary.includes('Strategy:') || m.summary.includes('High impact:'))
      .map((m) => this.parseStrategyRecall(m));
  }

  async recallHighImpactActions(
    tenantId: string,
    goal: string,
    limit = 3,
    agentKey?: string
  ): Promise<StrategyRecall[]> {
    if (!isStrategicMemoryEnabled()) return [];

    const recalled = await this.longTerm.recall(
      tenantId,
      `High impact: ${goal}`,
      limit,
      [MEMORY_KIND_PLAN],
      agentKey
    );

    return recalled
      .filter((m) => m.summary.includes('High impact:'))
      .map((m) => this.parseStrategyRecall(m));
  }

  async recallMerchantPatterns(
    tenantId: string,
    category?: string,
    limit = 5,
    agentKey?: string
  ): Promise<StrategyRecall[]> {
    if (!isStrategicMemoryEnabled()) return [];

    const query = category ? `Pattern: ${category}` : 'Pattern:';
    const recalled = await this.longTerm.recall(
      tenantId,
      query,
      limit,
      [MEMORY_KIND_PLAN],
      agentKey
    );

    return recalled
      .filter((m) => m.summary.includes('Pattern:'))
      .map((m) => this.parseStrategyRecall(m));
  }

  private formatStrategySummary(input: StrategyMemoryInput): string {
    const patterns = input.patterns?.length ? ` | Patterns: ${input.patterns.join(', ')}` : '';
    const goal = input.goalContext ? ` | Goal: ${input.goalContext}` : '';
    return `Strategy: ${input.strategy} | Context: ${input.context} | Outcome: ${input.outcome}${goal}${patterns}`;
  }

  private formatActionSummary(input: HighImpactActionInput): string {
    const ctx = input.context ? ` | Context: ${input.context}` : '';
    return `High impact: ${input.action} | Goal: ${input.goal} | Impact: ${input.impact.toFixed(2)} | Success: ${input.success}${ctx}`;
  }

  private formatPatternSummary(input: MerchantPatternInput): string {
    const obs = input.observations.slice(0, 2).join('; ');
    return `Pattern: ${input.pattern} | Category: ${input.category} | Confidence: ${input.confidence.toFixed(2)} | Observations: ${obs}`;
  }

  private resolvePriority(
    outcome: string,
    impact?: string
  ): 'high' | 'medium' | 'low' {
    if (outcome === 'success' && impact === 'high') return 'high';
    if (outcome === 'failure') return 'low';
    return 'medium';
  }

  private parseStrategyRecall(match: {
    id: string;
    summary: string;
    score: number;
    timestamp?: string;
  }): StrategyRecall {
    const parts = match.summary.split(' | ');
    const strategy = parts[0] || match.summary;
    const context = parts[1] || '';
    const outcome = parts[2] || '';
    const impact = parts[3];

    return {
      id: match.id,
      strategy,
      context,
      outcome,
      impact,
      timestamp: match.timestamp,
      score: match.score,
    };
  }
}
