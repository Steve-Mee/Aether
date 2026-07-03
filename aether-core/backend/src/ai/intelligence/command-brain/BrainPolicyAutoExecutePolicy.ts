import type { MerchantSettings } from '../../../shared/settings/merchantSettingsTypes';
import { assessAutonomy } from '../../../shared/policy/AutonomyPolicyService';
import type { ToolProposal } from '../personal-brain/tools/types';

/**
 * Tenant-policy auto-execute path — does not require adaptive learning or learned preference.
 */
export async function shouldPolicyAutoExecuteProposal(input: {
  tenantId: string;
  settings: MerchantSettings;
  proposal: ToolProposal;
}): Promise<{ eligible: boolean; reason: string; reasonCode?: string }> {
  const { proposal, settings } = input;

  if (proposal.approvalId) {
    return { eligible: false, reason: 'Proposal routed to approval inbox', reasonCode: 'has_approval' };
  }
  if (proposal.risk === 'high' || proposal.tool === 'createApproval') {
    return { eligible: false, reason: 'High-risk proposals require manual approval', reasonCode: 'high_risk_guard' };
  }
  if (proposal.tool === 'syncSupplier') {
    return { eligible: false, reason: 'Supplier sync requires inbox approval', reasonCode: 'supplier_sync' };
  }

  const riskClass = proposal.risk === 'medium' ? 'medium' : 'low';

  const assessment = assessAutonomy({
    settings,
    module: 'admin-command-bar',
    actionType: proposal.tool,
    tool: proposal.tool,
    payload: proposal.payload,
    riskClass,
  });

  if (assessment.executionMode === 'autonomous' && assessment.eligible) {
    return {
      eligible: true,
      reason: `Tenant policy: ${assessment.reason}`,
      reasonCode: assessment.reasonCode,
    };
  }

  return {
    eligible: false,
    reason: assessment.reason,
    reasonCode: assessment.reasonCode,
  };
}
