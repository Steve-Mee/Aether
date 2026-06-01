import { PolicyEngine } from '../ai/orchestrator/WorkflowEngine';

describe('PolicyEngine', () => {
  const engine = new PolicyEngine();

  it('requires approval for high-risk actions', () => {
    const decision = engine.evaluate('payment.refund', { amount: 50 });
    expect(decision.requiresApproval).toBe(true);
    expect(decision.riskClass).toBe('high');
  });

  it('auto-allows medium-risk mail.classify (mapped to email.auto_reply)', () => {
    const decision = engine.evaluate('mail.classify', {});
    expect(decision.requiresApproval).toBe(false);
    expect(decision.riskClass).toBe('medium');
  });

  it('requires approval for medium-risk above amount threshold', () => {
    const decision = engine.evaluate('price.change', { amount: 1500 });
    expect(decision.requiresApproval).toBe(true);
  });
});
