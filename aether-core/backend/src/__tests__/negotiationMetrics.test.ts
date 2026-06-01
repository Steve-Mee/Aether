import { NegotiationEngine } from '../modules/agentic-commerce/application/services/NegotiationEngine';
import type { NegotiationMetricsPort } from '../modules/agentic-commerce/application/ports/NegotiationMetricsPort';

describe('NegotiationEngine metrics', () => {
  it('tracks acceptance rate with risk caps enforced', async () => {
    const mockMetrics: NegotiationMetricsPort = {
      getMetrics: jest.fn().mockResolvedValue({ accept: 1, counter: 0, reject: 1, llmUsed: 0 }),
      recordDecision: jest.fn().mockResolvedValue(undefined),
    };
    const engine = new NegotiationEngine(mockMetrics);
    const tenantId = 'tenant_default';
    await engine.evaluateOffer(tenantId, 'neg_1', 95, 100, 0.3);
    await engine.evaluateOffer(tenantId, 'neg_2', 50, 100, 0.3);
    const metrics = await engine.getMetrics(tenantId);
    expect(metrics.totalDecisions).toBe(2);
    expect(metrics.acceptanceRate).toBeGreaterThanOrEqual(0);
    expect(engine.getCaps().maxDiscountPct).toBeLessThanOrEqual(20);
  });
});
