import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface SupplierToolsDeps {
  adminData: AdminDataPort;
}

export function createSupplierTool(deps: SupplierToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'createSupplier',
      description: 'Propose creating a new supplier',
      parameters: {
        name: { type: 'string', required: true, description: 'Supplier name' },
        website: { type: 'string', required: false, description: 'Supplier website URL' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'supplier-intelligence',
    },
    validate(input) {
      if (!String(input.name ?? '').trim()) {
        return { ok: false, error: 'name is required' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'createSupplier is propose-only' };
    },
    async buildProposal(_ctx, input) {
      const name = String(input.name ?? '').trim();
      const website = String(input.website ?? `https://${name.toLowerCase().replace(/\s+/g, '-')}.com`);
      const assessment = classifyBrainAction('createSupplier', input);
      return {
        tool: 'createSupplier',
        summary: `Nieuwe leverancier aanmaken: ${name}`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: { name, website },
      };
    },
    async executeConfirmed(ctx, payload) {
      const created = await deps.adminData.createSupplier(
        ctx.tenantId,
        String(payload.name),
        String(payload.website)
      );
      return {
        success: true,
        result: `Created supplier ${created.name} (${created.id})`,
      };
    },
  };
}
