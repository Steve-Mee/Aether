import { shouldAutoExecuteProposal } from '../BrainAutoExecutePolicy';
import type { MerchantSettings } from '../../../../shared/settings/merchantSettingsTypes';
import { DEFAULT_MERCHANT_SETTINGS } from '../../../../shared/settings/merchantSettingsTypes';

const adaptiveSettings: MerchantSettings = {
  ...DEFAULT_MERCHANT_SETTINGS,
  brainActionMode: 'adaptive',
  brainAdaptiveLearningEnabled: true,
  brainAdaptiveAutoExecuteEnabled: true,
  autoRunWindow: 'always',
};

describe('BrainAutoExecutePolicy', () => {
  it('rejects when adaptive auto-execute is disabled', async () => {
    const result = await shouldAutoExecuteProposal({
      tenantId: 't1',
      settings: { ...adaptiveSettings, brainAdaptiveAutoExecuteEnabled: false },
      proposal: {
        proposalId: 'p1',
        tool: 'createInsight',
        summary: 'insight',
        risk: 'low',
        requiresApproval: false,
        payload: {},
      },
      learnedPreference: 'prefer_auto',
    });
    expect(result.eligible).toBe(false);
  });

  it('rejects high-risk and inbox-routed proposals', async () => {
    const high = await shouldAutoExecuteProposal({
      tenantId: 't1',
      settings: adaptiveSettings,
      proposal: {
        proposalId: 'p1',
        tool: 'createApproval',
        summary: 'approval',
        risk: 'high',
        requiresApproval: true,
        payload: {},
      },
      learnedPreference: 'prefer_auto',
    });
    expect(high.eligible).toBe(false);

    const inbox = await shouldAutoExecuteProposal({
      tenantId: 't1',
      settings: adaptiveSettings,
      proposal: {
        proposalId: 'p2',
        tool: 'updatePrice',
        summary: 'price',
        risk: 'medium',
        requiresApproval: true,
        approvalId: 'ap1',
        payload: {},
      },
      learnedPreference: 'prefer_auto',
    });
    expect(inbox.eligible).toBe(false);
  });

  it('allows low-risk when learned preference is prefer_auto and window open', async () => {
    const result = await shouldAutoExecuteProposal({
      tenantId: 't1',
      settings: adaptiveSettings,
      proposal: {
        proposalId: 'p3',
        tool: 'createInsight',
        summary: 'insight',
        risk: 'low',
        requiresApproval: false,
        payload: {},
      },
      learnedPreference: 'prefer_auto',
    });
    expect(result.eligible).toBe(true);
  });
});
