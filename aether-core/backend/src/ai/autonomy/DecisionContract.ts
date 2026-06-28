import type { RiskClass } from '../../ai/orchestrator/WorkflowEngine';
import { policyEngine } from '../../ai/orchestrator/WorkflowEngine';
import { getMerchantSettings } from '../../shared/settings/TenantSettingsService';
import {
  assessAutonomy,
  assessAutonomyForTenant,
  type AutonomyAssessment,
} from '../../shared/policy/AutonomyPolicyService';
import { writeAuditLog } from '../../shared/audit/auditService';

export type DecisionAction = 'execute' | 'escalate' | 'approval_required' | 'skip';

export interface DecisionContractInput {
  tenantId: string;
  module: string;
  action: string;
  context: Record<string, unknown>;
  actorId?: string;
  agentKey?: string;
}

export interface DecisionContractResult {
  action: DecisionAction;
  policy: ReturnType<typeof policyEngine.evaluate>;
  assessment: AutonomyAssessment;
  auditRequired: boolean;
}

function mapAssessmentToAction(assessment: AutonomyAssessment, input: DecisionContractInput): DecisionAction {
  if (assessment.executionMode === 'autonomous' && assessment.eligible) {
    return 'execute';
  }
  if (assessment.executionMode === 'approval_required') {
    return 'approval_required';
  }
  if (input.module === 'aether-mail' && assessment.riskClass === 'medium') {
    const riskLevel = String(input.context.riskLevel ?? '');
    const confidence = Number(input.context.confidence ?? 0);
    return riskLevel === 'low' && confidence >= 0.7 ? 'execute' : 'escalate';
  }
  if (assessment.executionMode === 'blocked') {
    return 'skip';
  }
  return 'escalate';
}

/**
 * Merchant Autonomy Kernel — unified policy via AutonomyPolicyService.
 */
export class MerchantAutonomyKernel {
  async evaluate(input: DecisionContractInput): Promise<DecisionContractResult> {
    const policy = policyEngine.evaluate(input.action, input.context);
    const assessment = await assessAutonomyForTenant({
      tenantId: input.tenantId,
      module: input.module,
      actionType: input.action,
      payload: input.context,
      agentKey: input.agentKey,
      riskClass: policy.riskClass as RiskClass,
      getSettings: getMerchantSettings,
    });
    const action = mapAssessmentToAction(assessment, input);
    return { action, policy, assessment, auditRequired: true };
  }

  /** Sync evaluate when settings are already loaded (tests). */
  evaluateWithSettings(
    input: DecisionContractInput,
    settings: Parameters<typeof assessAutonomy>[0]['settings'],
  ): DecisionContractResult {
    const policy = policyEngine.evaluate(input.action, input.context);
    const assessment = assessAutonomy({
      settings,
      module: input.module,
      actionType: input.action,
      payload: input.context,
      agentKey: input.agentKey,
      riskClass: policy.riskClass as RiskClass,
    });
    const action = mapAssessmentToAction(assessment, input);
    return { action, policy, assessment, auditRequired: true };
  }

  async recordDecision(input: DecisionContractInput, result: DecisionContractResult): Promise<void> {
    if (!result.auditRequired) return;
    await writeAuditLog({
      tenantId: input.tenantId,
      module: 'autonomy-kernel',
      action: 'decision_contract_evaluated',
      actor: input.actorId,
      details: {
        module: input.module,
        action: input.action,
        decision: result.action,
        policy: result.policy,
        assessment: {
          executionMode: result.assessment.executionMode,
          reason: result.assessment.reason,
          reasonCode: result.assessment.reasonCode,
        },
      },
    });
  }
}

export const merchantAutonomyKernel = new MerchantAutonomyKernel();
