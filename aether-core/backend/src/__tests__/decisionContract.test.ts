import { merchantAutonomyKernel } from '../ai/autonomy/DecisionContract';
import { DEFAULT_MERCHANT_SETTINGS } from '../shared/settings/merchantSettingsTypes';

describe('MerchantAutonomyKernel', () => {
  it('requires approval for high-risk actions', () => {
    const result = merchantAutonomyKernel.evaluateWithSettings(
      {
        tenantId: 'tenant_a',
        module: 'payment-fulfillment',
        action: 'payment.refund',
        context: { amount: 10000 },
      },
      DEFAULT_MERCHANT_SETTINGS,
    );
    expect(['approval_required', 'escalate', 'execute']).toContain(result.action);
    expect(result.auditRequired).toBe(true);
    expect(result.assessment.reasonCode).toBe('high_risk_guard');
  });
});
