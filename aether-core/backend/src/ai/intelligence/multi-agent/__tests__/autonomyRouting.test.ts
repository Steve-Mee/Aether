import {
  resolveAutonomousRoute,
  assessAutonomousRouteAllowed,
} from '../autonomyRouting';
import { DEFAULT_MERCHANT_SETTINGS } from '../../../../shared/settings/merchantSettingsTypes';

jest.mock('../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn().mockResolvedValue({
    ...require('../../../../shared/settings/merchantSettingsTypes').DEFAULT_MERCHANT_SETTINGS,
  }),
}));

import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';

describe('autonomyRouting', () => {
  beforeEach(() => {
    jest.mocked(getMerchantSettings).mockResolvedValue({ ...DEFAULT_MERCHANT_SETTINGS });
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
      ...DEFAULT_MERCHANT_SETTINGS,
      autonomyLevel: 'low',
    });

    const result = await assessAutonomousRouteAllowed({
      tenantId: 'tenant_1',
      decisionType: 'pricing.adjust',
      result: 'increase 2%',
      rationale: 'test',
    });

    expect(result.allowed).toBe(false);
    expect(result.requiresApproval).toBe(true);
    expect(result.route?.agentKey).toBe('pricing');
  });

  it('allows routing when policy eligible for mail read', async () => {
    const result = await assessAutonomousRouteAllowed({
      tenantId: 'tenant_1',
      decisionType: 'mail.summary',
      result: 'send digest',
    });

    expect(result.allowed).toBe(true);
    expect(result.route).toEqual({ agentKey: 'mail', intent: 'EMAIL_SUMMARY' });
  });
});
