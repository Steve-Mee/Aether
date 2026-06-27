import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface OutcomesToolsDeps {
  adminData: AdminDataPort;
}

export function getOutcomesSummaryTool(deps: OutcomesToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getOutcomesSummary',
      description: 'Get attribution outcomes summary: billable records and verified revenue uplift',
      parameters: {},
      risk: 'low',
      kind: 'read',
      module: 'admin-command-bar',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx) {
      const { computeIncrementalRevenueUplift } = await import('../../../../ai/attribution/OutcomeEngine');
      const billable = await deps.adminData.countOutcomesByStatus(ctx.tenantId, 'billable');
      const proposed = await deps.adminData.countOutcomesByStatus(ctx.tenantId, 'proposed');
      const uplift = await computeIncrementalRevenueUplift(ctx.tenantId);
      return {
        success: true,
        billableCount: billable,
        proposedCount: proposed,
        verifiedUpliftEur: Math.round(uplift * 100) / 100,
        message: `Outcomes: ${billable} billable, verified uplift €${uplift.toFixed(2)}`,
      };
    },
  };
}

export function getLatestProposedOutcomeTool(deps: OutcomesToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getLatestProposedOutcome',
      description: 'Fetch the latest proposed outcome awaiting verification',
      parameters: {},
      risk: 'low',
      kind: 'read',
      module: 'admin-command-bar',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx) {
      const latest = await deps.adminData.findLatestProposedOutcome(ctx.tenantId);
      if (!latest) {
        return { success: true, found: false, message: 'No proposed outcomes to verify' };
      }
      return { success: true, found: true, outcome: latest };
    },
  };
}

export function verifyLatestOutcomeTool(deps: OutcomesToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'verifyLatestOutcome',
      description: 'Propose verifying the latest proposed outcome with causal evidence',
      parameters: {
        outcomeId: { type: 'string', required: false, description: 'Specific outcome ID (default: latest proposed)' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'admin-command-bar',
    },
    validate() {
      return { ok: true };
    },
    async executeRead() {
      return { error: 'verifyLatestOutcome is propose-only' };
    },
    async buildProposal(ctx, input) {
      const outcomeId = String(input.outcomeId ?? '').trim();
      const latest = outcomeId
        ? { id: outcomeId, metric: 'custom', confidence: 0.8 }
        : await deps.adminData.findLatestProposedOutcome(ctx.tenantId);
      const assessment = classifyBrainAction('verifyLatestOutcome', input);
      if (!latest) {
        return {
          tool: 'verifyLatestOutcome',
          summary: 'Geen proposed outcomes om te verifiëren',
          risk: assessment.risk,
          requiresApproval: false,
          expectedImpact: assessment.expectedImpact,
          confidence: 0,
          rationale: 'No proposed outcomes',
          payload: {},
        };
      }
      return {
        tool: 'verifyLatestOutcome',
        summary: `Verifiëren van outcome ${latest.id} (${latest.metric})`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: { outcomeId: latest.id, confidence: latest.confidence },
      };
    },
    async executeConfirmed(ctx, payload) {
      const { verifyOutcomeWithEvidence } = await import(
        '../../../../shared/outcomes/OutcomeVerificationService'
      );
      const outcomeId = String((payload as { outcomeId?: string }).outcomeId ?? '');
      const confidence = Number((payload as { confidence?: number }).confidence ?? 0.8);
      const verification = await verifyOutcomeWithEvidence(outcomeId, ctx.tenantId, 'verified', {
        method: 'causal_uplift',
        confidence,
        actorId: ctx.actorId,
      });
      if (!verification.success) {
        return { success: false, result: verification.reason ?? 'Verification failed', error: verification.reason };
      }
      return { success: true, result: `Verified outcome ${outcomeId}`, outcomeId, verified: true };
    },
  };
}
