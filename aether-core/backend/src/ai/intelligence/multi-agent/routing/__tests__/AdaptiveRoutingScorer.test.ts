import { AdaptiveRoutingScorer, ADAPTIVE_MIN_SAMPLE } from '../AdaptiveRoutingScorer';
import type { AgentPerformanceSnapshot } from '../AgentPerformancePort';

describe('AdaptiveRoutingScorer', () => {
  const scorer = new AdaptiveRoutingScorer();

  const perf = (overrides: Partial<AgentPerformanceSnapshot>): AgentPerformanceSnapshot => ({
    agentKey: 'pricing',
    successRate: 0.8,
    recentFailures: 0,
    sampleSize: ADAPTIVE_MIN_SAMPLE,
    ...overrides,
  });

  it('returns neutral score when sample size is low', () => {
    expect(scorer.scoreAgent({ agentKey: 'pricing' }, [perf({ sampleSize: 2 })])).toBe(0.5);
  });

  it('penalizes agents with recent failures', () => {
    const good = scorer.scoreAgent({ agentKey: 'pricing' }, [perf({ successRate: 0.9 })]);
    const bad = scorer.scoreAgent(
      { agentKey: 'pricing' },
      [perf({ successRate: 0.9, recentFailures: 3 })]
    );
    expect(bad).toBeLessThan(good);
  });

  it('ranks higher success agents first', () => {
    const performance: AgentPerformanceSnapshot[] = [
      perf({ agentKey: 'pricing', successRate: 0.9 }),
      perf({ agentKey: 'inventory', successRate: 0.6 }),
    ];
    const ranked = scorer.rankAgents(
      [{ agentKey: 'inventory' }, { agentKey: 'pricing' }],
      performance
    );
    expect(ranked[0]?.agentKey).toBe('pricing');
  });

  it('reorders sequential plan agents by performance', () => {
    const performance: AgentPerformanceSnapshot[] = [
      perf({ agentKey: 'supplier', successRate: 0.95 }),
      perf({ agentKey: 'pricing', successRate: 0.5 }),
    ];
    const plan = scorer.applyPlanWeights(
      {
        mode: 'sequential',
        agents: [
          { agentKey: 'pricing', intent: 'PRICING' },
          { agentKey: 'supplier', intent: 'SUPPLIER' },
        ],
      },
      performance
    );
    expect(plan.agents[0]?.agentKey).toBe('supplier');
    expect(plan.performanceScores?.supplier).toBeGreaterThan(plan.performanceScores?.pricing ?? 0);
  });
});
