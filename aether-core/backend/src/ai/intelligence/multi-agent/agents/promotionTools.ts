import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { CreatePromotionUseCase } from '../../../../modules/promotions/application/use-cases/CreatePromotionUseCase';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface PromotionToolsDeps {
  adminData: AdminDataPort;
}

export interface CreatePromotionToolDeps {
  createPromotion?: CreatePromotionUseCase;
}

export function suggestPromotionTool(deps: PromotionToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'suggestPromotion',
      description: 'Propose a promotion or discount campaign for low-stock or overstock SKUs',
      parameters: {
        productIds: { type: 'array', required: false, description: 'Target product IDs' },
        discountPct: { type: 'number', required: false, description: 'Suggested discount %' },
        reason: { type: 'string', required: false, description: 'Promotion rationale' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'inventory-pricing',
    },
    validate() {
      return { ok: true };
    },
    async executeRead() {
      return { error: 'suggestPromotion is propose-only' };
    },
    async buildProposal(ctx, input) {
      const productIds = Array.isArray(input.productIds) ? input.productIds : [];
      const discountPct = Number(input.discountPct ?? 10);
      const assessment = classifyBrainAction('suggestPromotion', input, { productCount: productIds.length });
      return {
        tool: 'suggestPromotion',
        summary: `Promotie ${discountPct}% voor ${productIds.length || 'low-stock'} SKU(s)`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: String(input.reason ?? assessment.rationale),
        payload: { productIds, discountPct, reason: input.reason },
      };
    },
    async executeConfirmed(ctx, payload) {
      return {
        success: true,
        result: 'Promotion proposal recorded',
        payload,
      };
    },
  };
}

export function suggestClearancePricingTool(deps: PromotionToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'suggestClearancePricing',
      description: 'Propose clearance/markdown pricing for slow-moving or low-stock inventory',
      parameters: {
        productId: { type: 'string', required: true, description: 'Product ID' },
        markdownPct: { type: 'number', required: false, description: 'Markdown % (default 15)' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'inventory-pricing',
    },
    validate(input) {
      if (!String(input.productId ?? '').trim()) return { ok: false, error: 'productId is required' };
      return { ok: true };
    },
    async executeRead() {
      return { error: 'suggestClearancePricing is propose-only' };
    },
    async buildProposal(ctx, input) {
      const productId = String(input.productId);
      const markdownPct = Number(input.markdownPct ?? 15);
      const items = await deps.adminData.listLowStockInventory(ctx.tenantId, 10);
      const match = items.find((i) => i.productId === productId);
      const assessment = classifyBrainAction('suggestClearancePricing', input);
      return {
        tool: 'suggestClearancePricing',
        summary: `Clearance ${markdownPct}% markdown voor ${productId}`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: match
          ? `Low stock (${match.quantity} units) — clearance recommended`
          : assessment.rationale,
        payload: { productId, markdownPct, currentQty: match?.quantity },
      };
    },
    async executeConfirmed(ctx, payload) {
      return { success: true, result: 'Clearance pricing proposal recorded', payload };
    },
  };
}

export function createPromotionTool(deps: CreatePromotionToolDeps = {}): BrainToolExecutor {
  return {
    definition: {
      name: 'createPromotion',
      description: 'Propose creating a named promotion campaign',
      parameters: {
        name: { type: 'string', required: true, description: 'Campaign name' },
        productIds: { type: 'array', required: false, description: 'Included product IDs' },
        discountPct: { type: 'number', required: false, description: 'Discount percentage' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'inventory-pricing',
    },
    validate(input) {
      if (!String(input.name ?? '').trim()) return { ok: false, error: 'name is required' };
      return { ok: true };
    },
    async executeRead() {
      return { error: 'createPromotion is propose-only' };
    },
    async buildProposal(ctx, input) {
      const assessment = classifyBrainAction('createPromotion', input);
      return {
        tool: 'createPromotion',
        summary: `Campagne "${input.name}" aanmaken`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: input,
      };
    },
    async executeConfirmed(ctx, payload) {
      const name = String(payload.name ?? '').trim();
      if (!name) {
        return { success: false, result: '', error: 'name is required' };
      }
      const discountPct = Number(payload.discountPct ?? 0);
      const productIds = Array.isArray(payload.productIds) ? payload.productIds : [];
      if (!deps.createPromotion) {
        return {
          success: true,
          result: 'Promotion campaign proposal recorded (persist unavailable)',
          payload,
        };
      }
      const result = await deps.createPromotion.execute(ctx.tenantId, {
        name,
        type: 'percent',
        value: Number.isFinite(discountPct) ? discountPct : 0,
        status: 'draft',
        configJson: productIds.length ? { productIds } : null,
      });
      return {
        success: true,
        result: `Promotion draft created: ${result.promotion.id}`,
        operationalMeta: { promotionId: result.promotion.id, ...payload },
      };
    },
  };
}
