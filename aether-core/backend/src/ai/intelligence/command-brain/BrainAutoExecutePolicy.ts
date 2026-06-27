import type { MerchantSettings } from '../../../shared/settings/merchantSettingsTypes';
import { isAutonomousWindowOpen } from '../../../shared/settings/merchantSettingsTypes';
import { assessApprovalAutoEligible } from '../../../shared/policy/assessApprovalAutoEligible';
import type { LearnedPreferenceHint } from './BrainActionPolicyResolver';
import type { ToolProposal } from '../personal-brain/tools/types';

export async function shouldAutoExecuteProposal(input: {
  tenantId: string;
  settings: MerchantSettings;
  proposal: ToolProposal;
  learnedPreference: LearnedPreferenceHint;
}): Promise<{ eligible: boolean; reason: string }> {
  if (input.settings.brainActionMode !== 'adaptive') {
    return { eligible: false, reason: 'Not in adaptive mode' };
  }
  if (!input.settings.brainAdaptiveLearningEnabled) {
    return { eligible: false, reason: 'Adaptive learning disabled' };
  }
  if (!input.settings.brainAdaptiveAutoExecuteEnabled) {
    return { eligible: false, reason: 'Adaptive auto-execute disabled' };
  }
  if (input.proposal.risk === 'high' || input.proposal.tool === 'createApproval') {
    return { eligible: false, reason: 'High-risk proposals require manual approval' };
  }
  if (input.proposal.approvalId) {
    return { eligible: false, reason: 'Proposal routed to approval inbox' };
  }
  if (input.learnedPreference !== 'prefer_auto') {
    return { eligible: false, reason: 'Insufficient learned confidence for auto-execute' };
  }
  if (!isAutonomousWindowOpen(input.settings)) {
    return { eligible: false, reason: 'Outside autonomous window' };
  }

  if (input.proposal.tool === 'updatePrice') {
    const assessment = await assessApprovalAutoEligible({
      tenantId: input.tenantId,
      module: 'admin-command-bar',
      actionType: 'price.change',
      payload: input.proposal.payload,
    });
    if (!assessment.eligible) {
      return { eligible: false, reason: assessment.reason };
    }
  }

  if (input.proposal.risk === 'low') {
    return { eligible: true, reason: 'Low-risk adaptive auto-execute' };
  }

  return { eligible: false, reason: 'Medium-risk requires inbox approval' };
}
