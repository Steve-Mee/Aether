import { assessApprovalAutoEligible } from '../../../../shared/policy/assessApprovalAutoEligible';
import {
  classifyBrainAction,
  LOW_RISK_EXECUTE_WHITELIST,
  type ActionRiskAssessment,
  type ClassifyBrainActionContext,
} from './ActionRiskClassifier';

export type BrainActionRiskAssessment = ActionRiskAssessment & {
  policyEligible?: boolean;
};

export async function assessBrainActionRisk(
  tenantId: string,
  tool: string,
  input: Record<string, unknown>,
  ctx?: ClassifyBrainActionContext
): Promise<BrainActionRiskAssessment> {
  const base = classifyBrainAction(tool, input, ctx);

  if (tool !== 'updatePrice') {
    return {
      ...base,
      policyEligible: base.risk === 'low' && !base.requiresInbox,
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
    };
  }

  return { ...base, policyEligible: policy.eligible };
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
    return assessment.risk === 'low' && !assessment.requiresInbox && assessment.policyEligible === true;
  }
  return false;
}
