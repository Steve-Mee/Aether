import { createApproval } from '../../../../shared/approval/approvalService';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { assessBrainActionRisk } from './ActionRiskPolicyBridge';
import { classifyBrainAction } from './ActionRiskClassifier';
import { buildApprovalRationale } from '../../command-brain/BrainApprovalRationaleBuilder';
import type { BrainToolExecutor, PersonalBrainToolRegistryDeps } from './types';

export function updatePriceTool(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'updatePrice',
      description: 'Propose a price change for matching products',
      parameters: {
        product: { type: 'string', required: true, description: 'Product name or search term' },
        percentage: { type: 'number', required: false, description: 'Price change percentage (default 5)' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'admin-command-bar',
    },
    validate(input) {
      if (!String(input.product ?? input.query ?? '').trim()) {
        return { ok: false, error: 'product is required' };
      }
      const pct = Number(input.percentage ?? 5);
      if (!Number.isFinite(pct) || pct < -50 || pct > 50) {
        return { ok: false, error: 'percentage must be between -50 and 50' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'updatePrice is propose-only' };
    },
    async buildProposal(ctx, input) {
      const productQuery = String(input.product ?? input.query ?? '');
      const pct = Number(input.percentage ?? 5);
      const hits = await deps.adminData.searchProductsByName(ctx.tenantId, productQuery, 10);
      if (hits.length === 0) {
        throw new Error('No products found for price update');
      }
      const proposals = hits.map((p) => ({
        id: p.id,
        name: p.name,
        currentPrice: p.price,
        proposedPrice: Number((p.price * (1 + pct / 100)).toFixed(2)),
      }));
      const assessment = await assessBrainActionRisk(ctx.tenantId, 'updatePrice', input, {
        productCount: hits.length,
        policyPayload: {
          productIds: hits.map((p) => p.id),
          percentage: pct,
        },
      });
      const names = hits.map((p) => p.name).join(', ');
      return {
        tool: 'updatePrice',
        summary: `Prijs ${pct > 0 ? 'verhogen' : 'verlagen'} met ${pct}% voor ${names}`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: {
          productIds: hits.map((p) => p.id),
          percentage: pct,
          previousPrices: hits.map((p) => ({ id: p.id, price: p.price })),
          proposals,
        },
      };
    },
    async executeConfirmed(ctx, payload) {
      const productIds = payload.productIds as string[];
      const percentage = Number(payload.percentage ?? 5);
      const previousPrices = (payload.previousPrices as Array<{ id: string; price: number }>) ?? [];
      const updated = await deps.adminData.updateProductPricesByIds(ctx.tenantId, productIds, percentage);
      return {
        success: true,
        result: `Updated prices on ${updated} product(s) by ${percentage}%`,
        undoable: true,
        operationalMeta: {
          source: 'brain.updatePrice',
          updatedCount: updated,
          priceRollback: { previousPrices, percentage },
        },
      };
    },
  };
}

export function syncSupplierTool(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'syncSupplier',
      description: 'Propose syncing/monitoring a supplier for price changes',
      parameters: {
        supplierId: { type: 'string', required: true, description: 'Supplier id to sync' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'supplier-intelligence',
    },
    validate(input) {
      if (!String(input.supplierId ?? '').trim()) {
        return { ok: false, error: 'supplierId is required' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'syncSupplier is propose-only' };
    },
    async buildProposal(_ctx, input) {
      const supplierId = String(input.supplierId);
      const assessment = classifyBrainAction('syncSupplier', input);
      return {
        tool: 'syncSupplier',
        summary: `Leverancier ${supplierId} synchroniseren en monitoren op prijswijzigingen`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: { supplierId },
      };
    },
    async executeConfirmed(ctx, payload) {
      if (!deps.supplierMonitor) {
        return { success: false, result: '', error: 'Supplier monitor not available' };
      }
      const supplierId = String(payload.supplierId);
      const result = await deps.supplierMonitor.monitorSupplier(supplierId, {
        tenantId: ctx.tenantId,
        actorId: ctx.actorId,
      });
      return {
        success: true,
        result: `Supplier ${supplierId} monitored — ${result.changeCount} change(s) detected`,
      };
    },
  };
}

/** Creates a real Approval row immediately (read tool — no proposal wrapper). */
export function createApprovalTool(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'createApproval',
      description:
        'Create a high-risk approval request in the merchant inbox for review (does not execute the action)',
      parameters: {
        module: { type: 'string', required: true, description: 'Target module e.g. admin-command-bar' },
        actionType: { type: 'string', required: true, description: 'Action type e.g. price.change' },
        summary: { type: 'string', required: true, description: 'Human-readable summary' },
        payload: { type: 'object', required: false, description: 'Action payload JSON' },
        expectedImpact: { type: 'string', required: false, description: 'Expected business impact' },
        confidence: { type: 'number', required: false, description: 'Brain confidence 0-1' },
        rationale: { type: 'string', required: false, description: 'Why this action is proposed' },
      },
      risk: 'high',
      kind: 'read',
      module: 'approval',
    },
    validate(input) {
      if (!String(input.module ?? '').trim() || !String(input.actionType ?? '').trim()) {
        return { ok: false, error: 'module and actionType are required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const module = String(input.module);
      const actionType = String(input.actionType);
      const summary = String(input.summary ?? `Goedkeuring voor ${actionType}`);
      const innerPayload = (input.payload as Record<string, unknown>) ?? {};
      const assessment = classifyBrainAction('createApproval', input);
      const rationaleBundle = await buildApprovalRationale({
        tenantId: ctx.tenantId,
        tool: 'createApproval',
        baseRationale: String(input.rationale ?? assessment.rationale ?? ''),
        ktGate: deps.ktGate,
        globalBrain: deps.globalBrain,
      });

      const approval = await createApproval({
        tenantId: ctx.tenantId,
        module,
        actionType,
        payload: {
          ...innerPayload,
          summary,
          risk: assessment.risk,
          confidence: assessment.confidence,
          expectedImpact: String(input.expectedImpact ?? assessment.expectedImpact),
          rationale: rationaleBundle.rationale,
          ktSnippets: rationaleBundle.ktSnippets,
          source: 'personal-brain',
          commandId: ctx.commandId,
        },
        requestedBy: ctx.actorId,
      });

      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'admin-command-bar',
        action: 'brain_approval_created',
        actor: ctx.actorId,
        details: {
          approvalId: approval.id,
          tool: 'createApproval',
          module,
          actionType,
          risk: assessment.risk,
          commandId: ctx.commandId,
        },
      });

      return {
        approvalId: approval.id,
        status: approval.status,
        summary,
        risk: assessment.risk,
        message: `Goedkeuring ${approval.id} aangemaakt — zichtbaar in Goedkeuringen.`,
      };
    },
  };
}

export function createInsightTool(deps: PersonalBrainToolRegistryDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'createInsight',
      description: 'Propose saving a merchant insight to personal brain memory',
      parameters: {
        category: {
          type: 'string',
          required: true,
          description: 'pricing | conversion | trend | inventory | marketing',
        },
        metric: { type: 'string', required: true, description: 'Metric name' },
        value: { type: 'number', required: true, description: 'Metric value' },
        summary: { type: 'string', required: true, description: 'Insight summary for merchant' },
      },
      risk: 'low',
      kind: 'propose',
      module: 'personal-brain',
    },
    validate(input) {
      if (!String(input.metric ?? '').trim() || !String(input.summary ?? '').trim()) {
        return { ok: false, error: 'metric and summary are required' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'createInsight is propose-only' };
    },
    async buildProposal(_ctx, input) {
      const assessment = classifyBrainAction('createInsight', input);
      return {
        tool: 'createInsight',
        summary: `Insight opslaan: ${String(input.summary)}`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: {
          category: String(input.category ?? 'pricing'),
          metric: String(input.metric),
          value: Number(input.value ?? 0),
          summary: String(input.summary),
          sampleSize: 1,
          confidence: assessment.confidence,
        },
      };
    },
    async executeConfirmed(ctx, payload) {
      const brain = deps.personalBrains.get(ctx.tenantId, ctx.agentKey ?? 'admin');
      const summary = String(payload.summary);
      await brain.remember({
        command: `insight:${payload.metric}`,
        intent: 'INSIGHT',
        result: summary,
      });

      let hiveNote = '';
      if (deps.submitInsight && (await deps.ktGate?.isEnabled(ctx.tenantId))) {
        try {
          await deps.submitInsight.execute(
            {
              id: '',
              merchantId: ctx.tenantId,
              category: (payload.category as 'pricing') ?? 'pricing',
              metric: String(payload.metric),
              value: Number(payload.value ?? 0),
              sampleSize: Number(payload.sampleSize ?? 1),
              confidence: Number(payload.confidence ?? 0.7),
              timestamp: new Date(),
            },
            ctx.tenantId
          );
          hiveNote = ' (also submitted to collective insights)';
        } catch {
          // best-effort
        }
      }

      return {
        success: true,
        result: `Insight saved: ${summary}${hiveNote}`,
      };
    },
  };
}
