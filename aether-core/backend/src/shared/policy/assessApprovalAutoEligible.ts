import type { RiskClass } from '../../ai/orchestrator/WorkflowEngine';
import { getMerchantSettings } from '../settings/TenantSettingsService';
import { assessAutonomyForTenant } from './AutonomyPolicyService';

export interface TenantApprovalPolicy {
  autoApproveLowRisk: boolean;
  autoApproveMediumRiskMail: boolean;
  maxAutoPriceChangePct: number;
  enabled: boolean;
}

/** @deprecated Use AutonomyPolicyService.assessAutonomyForTenant directly. */
export async function assessApprovalAutoEligible(params: {
  tenantId: string;
  module: string;
  actionType: string;
  payload: Record<string, unknown>;
}): Promise<{ eligible: boolean; reason: string; riskClass: RiskClass }> {
  const assessment = await assessAutonomyForTenant({
    ...params,
    getSettings: getMerchantSettings,
  });
  return {
    eligible: assessment.eligible,
    reason: assessment.reason,
    riskClass: assessment.riskClass,
  };
}
