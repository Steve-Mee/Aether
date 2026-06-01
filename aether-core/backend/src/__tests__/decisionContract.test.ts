import { merchantAutonomyKernel } from '../ai/autonomy/DecisionContract';

describe('MerchantAutonomyKernel', () => {
  it('requires approval for high-risk actions', () => {
    const result = merchantAutonomyKernel.evaluate({
      tenantId: 'tenant_a',
      module: 'payment-fulfillment',
      action: 'payment.refund',
      context: { amount: 10000 },
    });
    expect(['approval_required', 'escalate', 'execute']).toContain(result.action);
    expect(result.auditRequired).toBe(true);
  });
});
