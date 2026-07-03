import { shouldPolicyAutoExecuteProposal } from '../BrainPolicyAutoExecutePolicy';
import { DEFAULT_MERCHANT_SETTINGS, type MerchantSettings } from '../../../../shared/settings/merchantSettingsTypes';
import type { ToolProposal } from '../../personal-brain/tools/types';

const baseSettings: MerchantSettings = {
  ...DEFAULT_MERCHANT_SETTINGS,
  policyEnabled: true,
  autoApproveLowRisk: true,
  autoRunWindow: 'always',
  brainAdaptiveAutoExecuteEnabled: false,
  autonomyPrefs: {
    ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs,
    actionCategories: {
      ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories,
      pricing: {
        ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories.pricing,
        allowLowRiskAutoExecute: true,
      },
    },
  },
};

function proposal(overrides: Partial<ToolProposal> = {}): ToolProposal {
  return {
    proposalId: 'p1',
    tool: 'updatePrice',
    summary: 'test',
    risk: 'low',
    requiresApproval: false,
    payload: { percentage: 3, productIds: ['x'] },
    ...overrides,
  };
}

describe('BrainPolicyAutoExecutePolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks when approvalId present', async () => {
    const result = await shouldPolicyAutoExecuteProposal({
      tenantId: 't1',
      settings: baseSettings,
      proposal: proposal({ approvalId: 'ap1' }),
    });
    expect(result.eligible).toBe(false);
  });

  it('auto-eligible updatePrice when policy passes', async () => {
    const result = await shouldPolicyAutoExecuteProposal({
      tenantId: 't1',
      settings: baseSettings,
      proposal: proposal({ risk: 'low' }),
    });
    expect(result.eligible).toBe(true);
  });

  it('blocks syncSupplier', async () => {
    const result = await shouldPolicyAutoExecuteProposal({
      tenantId: 't1',
      settings: baseSettings,
      proposal: proposal({ tool: 'syncSupplier', risk: 'medium' }),
    });
    expect(result.eligible).toBe(false);
  });

  it('blocks when policy disabled', async () => {
    const result = await shouldPolicyAutoExecuteProposal({
      tenantId: 't1',
      settings: { ...baseSettings, policyEnabled: false },
      proposal: proposal(),
    });
    expect(result.eligible).toBe(false);
  });
});
