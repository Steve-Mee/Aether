import { assessBrainActionRisk, isLowRiskExecutableAsync } from '../ActionRiskPolicyBridge';
import { classifyBrainAction } from '../ActionRiskClassifier';
import { DEFAULT_MERCHANT_SETTINGS } from '../../../../../shared/settings/merchantSettingsTypes';

jest.mock('../../../../../shared/policy/assessApprovalAutoEligible', () => ({
  assessApprovalAutoEligible: jest.fn(),
}));

jest.mock('../../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn(),
}));

import { assessApprovalAutoEligible } from '../../../../../shared/policy/assessApprovalAutoEligible';
import { getMerchantSettings } from '../../../../../shared/settings/TenantSettingsService';

const policyEnabledSettings = {
  ...DEFAULT_MERCHANT_SETTINGS,
  policyEnabled: true,
  autoApproveLowRisk: true,
};

describe('ActionRiskPolicyBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getMerchantSettings as jest.Mock).mockResolvedValue(policyEnabledSettings);
  });

  it('downgrades small positive updatePrice when tenant policy eligible', async () => {
    (assessApprovalAutoEligible as jest.Mock).mockResolvedValue({
      eligible: true,
      reason: 'Prijs ≤5% — binnen drempel',
      riskClass: 'medium',
    });

    const result = await assessBrainActionRisk('tenant-1', 'updatePrice', { percentage: 3 }, {
      productCount: 2,
      policyPayload: { productIds: ['p1'], percentage: 3 },
    });

    expect(result.risk).toBe('low');
    expect(result.requiresInbox).toBe(false);
    expect(result.policyEligible).toBe(true);
  });

  it('keeps medium/high inbox for large updatePrice', async () => {
    (assessApprovalAutoEligible as jest.Mock).mockResolvedValue({
      eligible: false,
      reason: 'Te groot',
      riskClass: 'high',
    });

    const result = await assessBrainActionRisk('tenant-1', 'updatePrice', { percentage: 15 }, {
      productCount: 1,
      policyPayload: { productIds: ['p1'], percentage: 15 },
    });

    expect(result.risk).toBe('high');
    expect(result.requiresInbox).toBe(true);
  });

  it('does not allow negative updatePrice for async whitelist', async () => {
    (assessApprovalAutoEligible as jest.Mock).mockResolvedValue({
      eligible: false,
      reason: 'Geen daling',
      riskClass: 'medium',
    });

    const allowed = await isLowRiskExecutableAsync('tenant-1', 'updatePrice', { percentage: -3 });
    expect(allowed).toBe(false);
  });

  it('classifies createInsight as statically low risk', async () => {
    const result = await assessBrainActionRisk('tenant-1', 'createInsight', {
      metric: 'sales',
      summary: 'test',
    });
    expect(result.risk).toBe('low');
    expect(result.requiresInbox).toBe(false);
  });

  it('syncSupplier uses classifier without policy downgrade', async () => {
    const base = classifyBrainAction('syncSupplier', { supplierId: 's1' });
    const result = await assessBrainActionRisk('tenant-1', 'syncSupplier', { supplierId: 's1' });
    expect(result.risk).toBe(base.risk);
    expect(result.requiresInbox).toBe(true);
  });
});
