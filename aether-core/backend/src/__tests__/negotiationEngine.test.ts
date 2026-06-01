import { NegotiationEngine } from '../modules/agentic-commerce/application/services/NegotiationEngine';
import type { NegotiationMetricsPort } from '../modules/agentic-commerce/application/ports/NegotiationMetricsPort';

describe('NegotiationEngine', () => {
  const mockMetrics: NegotiationMetricsPort = {
    getMetrics: jest.fn().mockResolvedValue({ accept: 1, counter: 0, reject: 0, llmUsed: 0 }),
    recordDecision: jest.fn().mockResolvedValue(undefined),
  };
  const engine = new NegotiationEngine(mockMetrics);
  const tenantId = 'tenant_default';

  it('accepts offers within 5%', async () => {
    const decision = await engine.evaluateOffer(tenantId, 'neg_1', 98, 100, 0.3);
    expect(decision).toBe('ACCEPT');
  });

  it('rejects when max rounds exceeded', async () => {
    process.env.NEGOTIATION_MAX_ROUNDS = '1';
    const e = new NegotiationEngine(mockMetrics);
    const first = await e.evaluateOffer(tenantId, 'neg_2', 96, 100, 0.3, 0);
    expect(first).toBe('ACCEPT');
    const decision = await e.evaluateOffer(tenantId, 'neg_2', 96, 100, 0.3, 1);
    expect(decision).toBe('REJECT');
    delete process.env.NEGOTIATION_MAX_ROUNDS;
  });

  it('calculates counter offer above midpoint', () => {
    expect(engine.calculateCounterOffer(90, 100)).toBeGreaterThan(95);
  });
});
