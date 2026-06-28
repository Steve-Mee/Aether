import { assessApprovalAutoEligible } from '../../../../shared/policy/assessApprovalAutoEligible';
import { assessAutonomyForTenant } from '../../../../shared/policy/AutonomyPolicyService';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import {
  classifyBrainAction,
  LOW_RISK_EXECUTE_WHITELIST,
  type ActionRiskAssessment,
  type ClassifyBrainActionContext,
} from './ActionRiskClassifier';

export type BrainActionRiskAssessment = ActionRiskAssessment & {
  policyEligible?: boolean;
  categoryBlocked?: boolean;
  autonomyReason?: string;
};

export async function assessBrainActionRisk(
  tenantId: string,
  tool: string,
  input: Record<string, unknown>,
  ctx?: ClassifyBrainActionContext
): Promise<BrainActionRiskAssessment> {
  const base = classifyBrainAction(tool, input, ctx);

  const autonomyAssessment = await assessAutonomyForTenant({
    tenantId,
    module: 'admin-command-bar',
    actionType: tool,
    tool,
    payload: input,
    riskClass: base.risk === 'high' ? 'high' : base.risk === 'medium' ? 'medium' : 'low',
    getSettings: getMerchantSettings,
  });

  if (autonomyAssessment.executionMode === 'blocked') {
    return {
      ...base,
      requiresInbox: true,
      policyEligible: false,
      categoryBlocked: true,
      autonomyReason: autonomyAssessment.reason,
    };
  }

  if (tool !== 'updatePrice') {
    const eligible =
      autonomyAssessment.eligible ||
      (base.risk === 'low' && !base.requiresInbox && autonomyAssessment.executionMode === 'autonomous');
    return {
      ...base,
      policyEligible: eligible,
      autonomyReason: autonomyAssessment.reason,
    };
  }

  const pct = Number(input.percentage ?? 5);
  const policyPayload: Record<string, unknown> = {
    percentage: pct,
    ...(ctx?.policyPayload ?? {}),
  };

  const policy = await assessApprovalAutoEligible({
    tenantId,
    module: 'admin-command-bar',
    actionType: 'price.change',
    payload: policyPayload,
  });

  if (policy.eligible && pct > 0 && Math.abs(pct) <= 10) {
    return {
      risk: 'low',
      requiresInbox: false,
      expectedImpact: base.expectedImpact,
      confidence: 0.82,
      rationale: `Kleine prijswijziging (${pct}%) — binnen tenant auto-drempel. ${policy.reason}`,
      policyEligible: true,
      autonomyReason: policy.reason,
    };
  }

  return {
    ...base,
    policyEligible: policy.eligible,
    autonomyReason: policy.reason,
  };
}

export async function isLowRiskExecutableAsync(
  tenantId: string,
  tool: string,
  input: Record<string, unknown>,
  ctx?: ClassifyBrainActionContext
): Promise<boolean> {
  if (LOW_RISK_EXECUTE_WHITELIST.has(tool)) return true;
  if (tool === 'updatePrice') {
    const assessment = await assessBrainActionRisk(tenantId, tool, input, ctx);
    return (
      assessment.risk === 'low' &&
      !assessment.requiresInbox &&
      assessment.policyEligible === true &&
      !assessment.categoryBlocked
    );
  }
  const assessment = await assessBrainActionRisk(tenantId, tool, input, ctx);
  if (assessment.categoryBlocked) return false;
  return assessment.policyEligible === true;
}
