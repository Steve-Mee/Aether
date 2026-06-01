import { policyEngine } from '../orchestrator/WorkflowEngine';
import { writeAuditLog } from '../../shared/audit/auditService';

export type DecisionAction = 'execute' | 'escalate' | 'approval_required' | 'skip';

export interface DecisionContractInput {
  tenantId: string;
  module: string;
  action: string;
  context: Record<string, unknown>;
  actorId?: string;
}

export interface DecisionContractResult {
  action: DecisionAction;
  policy: ReturnType<typeof policyEngine.evaluate>;
  auditRequired: boolean;
}

/**
 * Merchant Autonomy Kernel MVP — unified policy → decision → audit contract.
 * Mail and supplier modules delegate here for consistent gates.
 */
export class MerchantAutonomyKernel {
  evaluate(input: DecisionContractInput): DecisionContractResult {
    const policy = policyEngine.evaluate(input.action, input.context);

    let action: DecisionAction = 'execute';
    if (policy.riskClass === 'high' || policy.requiresApproval) {
      action = 'approval_required';
    } else if (policy.riskClass === 'medium' && input.module === 'aether-mail') {
      const riskLevel = String(input.context.riskLevel ?? '');
      const confidence = Number(input.context.confidence ?? 0);
      action = riskLevel === 'low' && confidence >= 0.7 ? 'execute' : 'escalate';
    }

    return { action, policy, auditRequired: true };
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
      },
    });
  }
}

export const merchantAutonomyKernel = new MerchantAutonomyKernel();
