import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

const APPROVAL_MODULES = [
  'aether-mail',
  'supplier-intelligence',
  'inventory-pricing',
  'admin-command-bar',
];

export interface ApprovalToolsDeps {
  adminData: AdminDataPort;
}

export function listPendingApprovalsTool(deps: ApprovalToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'listPendingApprovals',
      description: 'List pending approval items across merchant modules',
      parameters: {
        modules: {
          type: 'array',
          required: false,
          description: 'Module filter (default: mail, supplier, inventory)',
        },
      },
      risk: 'low',
      kind: 'read',
      module: 'admin-command-bar',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const modules = Array.isArray(input.modules)
        ? (input.modules as string[])
        : APPROVAL_MODULES;
      const pending = await deps.adminData.listPendingApprovals(ctx.tenantId, modules);
      return { success: true, count: pending.length, items: pending };
    },
  };
}

export function summarizeApprovalsByModuleTool(deps: ApprovalToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'summarizeApprovalsByModule',
      description: 'Summarize pending approvals grouped by module',
      parameters: {},
      risk: 'low',
      kind: 'read',
      module: 'admin-command-bar',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx) {
      const pending = await deps.adminData.listPendingApprovals(ctx.tenantId, APPROVAL_MODULES);
      const byModule: Record<string, number> = {};
      for (const item of pending) {
        const mod = item.module ?? 'unknown';
        byModule[mod] = (byModule[mod] ?? 0) + 1;
      }
      const total = await deps.adminData.countPendingApprovals(ctx.tenantId);
      return {
        success: true,
        totalPending: total,
        byModule,
        message: `${total} approvals pending review`,
      };
    },
  };
}

export function approveLowRiskTool(deps: ApprovalToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'approveLowRisk',
      description: 'Propose approving low-risk pending approval items',
      parameters: {
        ids: { type: 'array', required: false, description: 'Explicit approval IDs to approve' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'admin-command-bar',
    },
    validate() {
      return { ok: true };
    },
    async executeRead() {
      return { error: 'approveLowRisk is propose-only' };
    },
    async buildProposal(ctx, input) {
      const pending = await deps.adminData.listPendingApprovals(ctx.tenantId, APPROVAL_MODULES);
      let ids = Array.isArray(input.ids) ? (input.ids as string[]).map(String) : [];
      if (ids.length === 0) {
        ids = pending
          .filter((a) => {
            try {
              const payload = JSON.parse(a.payload ?? '{}') as { riskLevel?: string };
              return payload.riskLevel !== 'high';
            } catch {
              return false;
            }
          })
          .map((a) => a.id);
      }
      const assessment = classifyBrainAction('approveLowRisk', input);
      return {
        tool: 'approveLowRisk',
        summary: `Goedkeuren van ${ids.length} low-risk pending item(s)`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: { ids },
      };
    },
    async executeConfirmed(ctx, payload) {
      const ids = ((payload as { ids?: string[] }).ids ?? []).filter(Boolean);
      const approved = await deps.adminData.approveLowRisk(ctx.tenantId, ids, ctx.actorId);
      return {
        success: true,
        result: `Approved ${approved} low-risk item(s)`,
        approved,
        idsRequested: ids.length,
      };
    },
  };
}
