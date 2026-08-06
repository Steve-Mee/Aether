import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';
import { createApproval } from '../../../../shared/approval/approvalService';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { prisma } from '../../../../shared/prisma/client';

export interface ReturnsToolsDeps {
  adminData: AdminDataPort;
}

const NEGATIVE_STATUSES = new Set(['returned', 'refunded', 'cancelled', 'canceled']);

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase();
}

export function analyzeReturnPatternsTool(deps: ReturnsToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'analyzeReturnPatterns',
      description: 'Analyze return/refund/cancel patterns from recent orders and status trends',
      parameters: {
        days: { type: 'number', required: false, description: 'Window in days (default 30)' },
        limit: { type: 'number', required: false, description: 'Recent orders sample size (default 50)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'returns-quality',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const days = Number(input.days ?? 30);
      const limit = Math.min(Number(input.limit ?? 50), 200);
      const [trends, recent] = await Promise.all([
        deps.adminData.getOrderTrends(ctx.tenantId, days),
        deps.adminData.listRecentOrdersDetailed(ctx.tenantId, limit),
      ]);

      const statusBreakdown = trends.statusBreakdown ?? {};
      const totalFromTrends = Object.values(statusBreakdown).reduce((a, b) => a + b, 0);
      let negativeFromTrends = 0;
      for (const [status, count] of Object.entries(statusBreakdown)) {
        if (NEGATIVE_STATUSES.has(normalizeStatus(status))) {
          negativeFromTrends += count;
        }
      }

      const sampleNegative = recent.filter((o) => NEGATIVE_STATUSES.has(normalizeStatus(o.status)));
      const returnRatePct =
        totalFromTrends > 0
          ? Math.round((negativeFromTrends / totalFromTrends) * 1000) / 10
          : recent.length > 0
            ? Math.round((sampleNegative.length / recent.length) * 1000) / 10
            : 0;

      const byStatus: Record<string, number> = {};
      for (const order of sampleNegative) {
        const key = normalizeStatus(order.status);
        byStatus[key] = (byStatus[key] ?? 0) + 1;
      }

      return {
        success: true,
        windowDays: days,
        returnRatePct,
        negativeOrderCount: negativeFromTrends || sampleNegative.length,
        totalOrdersConsidered: totalFromTrends || recent.length,
        sampleByStatus: byStatus,
        demandTrendPct: trends.trendPct,
        riskLevel: returnRatePct >= 8 ? 'high' : returnRatePct >= 4 ? 'elevated' : 'normal',
        message: `Retour/negatief percentage ~${returnRatePct}% over ${days}d (${negativeFromTrends || sampleNegative.length} signalen)`,
      };
    },
  };
}

export function signalSupplierQualityIssuesTool(deps: ReturnsToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'signalSupplierQualityIssues',
      description: 'Flag likely supplier quality issues from elevated return/refund patterns',
      parameters: {
        thresholdPct: {
          type: 'number',
          required: false,
          description: 'Return-rate threshold to flag (default 8)',
        },
      },
      risk: 'low',
      kind: 'read',
      module: 'returns-quality',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const thresholdPct = Number(input.thresholdPct ?? 8);
      const [trends, suppliers] = await Promise.all([
        deps.adminData.getOrderTrends(ctx.tenantId, 30),
        deps.adminData.listSuppliers(ctx.tenantId, 20),
      ]);

      const statusBreakdown = trends.statusBreakdown ?? {};
      const total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1;
      let negative = 0;
      for (const [status, count] of Object.entries(statusBreakdown)) {
        if (NEGATIVE_STATUSES.has(normalizeStatus(status))) negative += count;
      }
      const returnRatePct = Math.round((negative / total) * 1000) / 10;
      const flagged = returnRatePct >= thresholdPct;

      return {
        success: true,
        flagged,
        returnRatePct,
        thresholdPct,
        supplierCount: suppliers.length,
        signals: flagged
          ? [
              {
                type: 'elevated_return_rate',
                severity: returnRatePct >= thresholdPct * 1.5 ? 'high' : 'medium',
                message: `Retourpercentage ${returnRatePct}% ≥ drempel ${thresholdPct}% — review leverancierskwaliteit`,
                suggestedDelegate: 'supplier',
              },
            ]
          : [],
        message: flagged
          ? `Kwaliteitssignaal: retourpercentage ${returnRatePct}% — delegeer naar Supplier Agent`
          : `Geen verhoogd kwaliteitssignaal (retour ${returnRatePct}% < ${thresholdPct}%)`,
      };
    },
  };
}

export function suggestReturnReductionTool(deps: ReturnsToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'suggestReturnReduction',
      description: 'Propose actions to reduce returns based on current return-rate signals',
      parameters: {
        focus: {
          type: 'string',
          required: false,
          description: 'Optional focus: quality | listing | packaging | inventory',
        },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'returns-quality',
    },
    validate() {
      return { ok: true };
    },
    async executeRead() {
      return { error: 'suggestReturnReduction is propose-only' };
    },
    async buildProposal(ctx, input) {
      const focus = String(input.focus ?? 'quality').toLowerCase();
      const trends = await deps.adminData.getOrderTrends(ctx.tenantId, 30);
      const statusBreakdown = trends.statusBreakdown ?? {};
      const total = Object.values(statusBreakdown).reduce((a, b) => a + b, 0) || 1;
      let negative = 0;
      for (const [status, count] of Object.entries(statusBreakdown)) {
        if (NEGATIVE_STATUSES.has(normalizeStatus(status))) negative += count;
      }
      const returnRatePct = Math.round((negative / total) * 1000) / 10;

      const actionsByFocus: Record<string, string[]> = {
        quality: ['audit_top_returned_skus', 'request_supplier_quality_report', 'add_qc_checklist'],
        listing: ['improve_size_fit_copy', 'add_detail_photos', 'clarify_specs'],
        packaging: ['reinforce_packaging', 'include_care_card'],
        inventory: ['quarantine_suspect_batches', 'prefer_alternate_supplier_stock'],
      };
      const actions = actionsByFocus[focus] ?? actionsByFocus.quality;
      const assessment = classifyBrainAction('suggestReturnReduction', input);

      return {
        tool: 'suggestReturnReduction',
        summary: `Retourreductie (${focus}) bij ~${returnRatePct}% negatieve orders`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: Math.min(0.85, 0.45 + returnRatePct / 40),
        rationale: `Gebaseerd op orderstatus-signalen over 30d; focus=${focus}`,
        payload: {
          focus,
          returnRatePct,
          suggestedActions: actions,
          collaborateWith: focus === 'inventory' ? ['inventory'] : ['supplier', 'inventory'],
        },
      };
    },
    async executeConfirmed(ctx, payload) {
      const focus = String(payload.focus ?? 'quality');
      const returnRatePct = Number(payload.returnRatePct ?? 0);
      const suggestedActions = Array.isArray(payload.suggestedActions)
        ? payload.suggestedActions.map(String)
        : [];

      const insight = await prisma.insight.create({
        data: {
          tenantId: ctx.tenantId,
          type: 'returns-quality',
          content: JSON.stringify({
            focus,
            returnRatePct,
            suggestedActions,
            collaborateWith: payload.collaborateWith,
            source: 'suggestReturnReduction',
          }),
        },
      });

      let approvalId: string | undefined;
      if (returnRatePct >= 8) {
        const approval = await createApproval({
          tenantId: ctx.tenantId,
          module: 'returns-quality',
          actionType: 'return_reduction_plan',
          payload: {
            insightId: insight.id,
            focus,
            returnRatePct,
            suggestedActions,
          },
          requestedBy: ctx.actorId,
        });
        approvalId = approval.id;
      }

      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'returns-quality',
        action: 'return_reduction_insight_persisted',
        actor: ctx.actorId,
        details: { insightId: insight.id, approvalId, returnRatePct, focus },
      });

      return {
        success: true,
        result: `Return-reduction insight saved (${insight.id})${
          approvalId ? `; follow-up approval ${approvalId}` : ''
        }`,
        operationalMeta: { insightId: insight.id, approvalId },
      };
    },
  };
}
