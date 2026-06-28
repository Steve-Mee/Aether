import { writeAuditLog } from '../audit/auditService';
import type { AutonomyAssessment } from './AutonomyPolicyService';

export type AutonomyAuditSource =
  | 'proactive'
  | 'brain_tool'
  | 'approval'
  | 'orchestrator';

export interface AutonomyAuditInput {
  tenantId: string;
  source: AutonomyAuditSource;
  assessment: AutonomyAssessment;
  preset?: string;
  relatedId?: string;
  actor?: string;
}

function auditActionForAssessment(assessment: AutonomyAssessment): string {
  if (assessment.executionMode === 'autonomous' && assessment.eligible) {
    return 'autonomy_action_allowed';
  }
  if (assessment.executionMode === 'blocked') {
    return 'autonomy_action_blocked';
  }
  return 'autonomy_action_deferred';
}

export async function logAutonomyDecision(input: AutonomyAuditInput): Promise<void> {
  const action = auditActionForAssessment(input.assessment);
  await writeAuditLog({
    tenantId: input.tenantId,
    module: 'autonomy-policy',
    action,
    actor: input.actor ?? 'aether',
    details: {
      source: input.source,
      category: input.assessment.category,
      reason: input.assessment.reason,
      reasonCode: input.assessment.reasonCode,
      riskClass: input.assessment.riskClass,
      executionMode: input.assessment.executionMode,
      preset: input.preset,
      relatedId: input.relatedId,
    },
  });
}

export async function logAutonomyDecisionFromAssessment(
  tenantId: string,
  source: AutonomyAuditSource,
  assessment: AutonomyAssessment,
  opts?: { preset?: string; relatedId?: string; actor?: string },
): Promise<void> {
  await logAutonomyDecision({
    tenantId,
    source,
    assessment,
    preset: opts?.preset,
    relatedId: opts?.relatedId,
    actor: opts?.actor,
  });
}
