import type { MerchantSettings } from '../../../shared/settings/merchantSettingsTypes';
import { isAutonomousWindowOpen } from '../../../shared/settings/merchantSettingsTypes';
import { assessApprovalAutoEligible } from '../../../shared/policy/assessApprovalAutoEligible';
import type { ToolProposal } from '../personal-brain/tools/types';

/**
 * Tenant-policy auto-execute path — does not require adaptive learning or learned preference.
 */
export async function shouldPolicyAutoExecuteProposal(input: {
  tenantId: string;
  settings: MerchantSettings;
  proposal: ToolProposal;
}): Promise<{ eligible: boolean; reason: string }> {
  const { proposal, settings, tenantId } = input;

  if (!settings.policyEnabled) {
    return { eligible: false, reason: 'Tenant approval policy disabled' };
  }
  if (!isAutonomousWindowOpen(settings)) {
    return { eligible: false, reason: 'Outside autonomous window' };
  }
  if (proposal.approvalId) {
    return { eligible: false, reason: 'Proposal routed to approval inbox' };
  }
  if (proposal.risk === 'high' || proposal.tool === 'createApproval') {
    return { eligible: false, reason: 'High-risk proposals require manual approval' };
  }
  if (proposal.tool === 'syncSupplier') {
    return { eligible: false, reason: 'Supplier sync requires inbox approval' };
  }

  if (proposal.tool === 'updatePrice') {
    const assessment = await assessApprovalAutoEligible({
      tenantId,
      module: 'admin-command-bar',
      actionType: 'price.change',
      payload: proposal.payload,
    });
    if (!assessment.eligible) {
      return { eligible: false, reason: assessment.reason };
    }
    return { eligible: true, reason: `Tenant policy: ${assessment.reason}` };
  }

  if (proposal.tool === 'createInsight') {
    const assessment = await assessApprovalAutoEligible({
      tenantId,
      module: 'personal-brain',
      actionType: 'brain.createInsight',
      payload: proposal.payload,
    });
    if (!assessment.eligible && proposal.risk !== 'low') {
      return { eligible: false, reason: assessment.reason };
    }
    if (proposal.risk === 'low' && settings.autoApproveLowRisk) {
      return { eligible: true, reason: 'Low-risk insight — tenant policy allows auto-execute' };
    }
    return { eligible: false, reason: assessment.reason };
  }

  if (proposal.risk === 'low' && settings.autoApproveLowRisk) {
    return { eligible: true, reason: 'Low-risk — tenant autoApproveLowRisk' };
  }

  return { eligible: false, reason: 'Not eligible under tenant policy' };
}
