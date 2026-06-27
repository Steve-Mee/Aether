import {
  resolveAutonomousRoute,
  assessAutonomousRouteAllowed,
} from '../autonomyRouting';

jest.mock('../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn().mockResolvedValue({
    autonomyLevel: 'medium',
    policyEnabled: true,
    autoApproveLowRisk: true,
    autoApproveMediumRiskMail: false,
    maxAutoPriceChangePct: 5,
    maxMarginImpactEuro: 100,
    autonomousWindowStart: '00:00',
    autonomousWindowEnd: '23:59',
  }),
}));

jest.mock('../../../../shared/policy/assessApprovalAutoEligible', () => ({
  assessApprovalAutoEligible: jest.fn(),
}));

import { assessApprovalAutoEligible } from '../../../../shared/policy/assessApprovalAutoEligible';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';

describe('autonomyRouting', () => {
  beforeEach(() => {
    jest.mocked(assessApprovalAutoEligible).mockResolvedValue({
      eligible: true,
      reason: 'Laag risico',
      riskClass: 'low',
    });
  });

  it('resolveAutonomousRoute maps pricing decisions', () => {
    expect(resolveAutonomousRoute('pricing.adjust')).toEqual({
      agentKey: 'pricing',
      intent: 'PRICING_OPTIMIZE',
    });
  });

  it('resolveAutonomousRoute maps inventory decisions', () => {
    expect(resolveAutonomousRoute('inventory.stock_low')).toEqual({
      agentKey: 'inventory',
      intent: 'INVENTORY_STATUS',
    });
  });

  it('blocks medium risk when autonomyLevel is low', async () => {
    jest.mocked(getMerchantSettings).mockResolvedValueOnce({
      autonomyLevel: 'low',
      policyEnabled: true,
      autoApproveLowRisk: true,
      autoApproveMediumRiskMail: false,
      maxAutoPriceChangePct: 5,
      maxMarginImpactEuro: 100,
      autonomousWindowStart: '00:00',
      autonomousWindowEnd: '23:59',
    } as never);
    jest.mocked(assessApprovalAutoEligible).mockResolvedValueOnce({
      eligible: false,
      reason: 'Medium risk',
      riskClass: 'medium',
    });

    const result = await assessAutonomousRouteAllowed({
      tenantId: 'tenant_1',
      decisionType: 'pricing.adjust',
      result: 'increase 2%',
    });

    expect(result.allowed).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.route?.agentKey).toBe('pricing');
  });

  it('allows routing when policy eligible', async () => {
    const result = await assessAutonomousRouteAllowed({
      tenantId: 'tenant_1',
      decisionType: 'mail.summary',
      result: 'send digest',
    });

    expect(result.allowed).toBe(true);
    expect(result.route).toEqual({ agentKey: 'mail', intent: 'EMAIL_SUMMARY' });
  });
});
