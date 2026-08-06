import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { CreatePromotionUseCase } from '../../../../modules/promotions/application/use-cases/CreatePromotionUseCase';
import type { CreatePromotionInput } from '../../../../modules/promotions/domain/repositories/PromotionRepository';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolContext, BrainToolExecutor, ToolExecutionResult } from '../../personal-brain/tools/types';

export interface PromotionToolsDeps {
  adminData: AdminDataPort;
  createPromotion?: CreatePromotionUseCase;
}

export interface CreatePromotionToolDeps {
  createPromotion?: CreatePromotionUseCase;
}

function promotionInputFromPayload(
  tool: string,
  payload: Record<string, unknown>
): CreatePromotionInput | null {
  switch (tool) {
    case 'suggestPromotion': {
      const discountPct = Number(payload.discountPct ?? 10);
      const productIds = Array.isArray(payload.productIds) ? payload.productIds.map(String) : [];
      const reason = String(payload.reason ?? '').trim();
      return {
        name: reason || `AI Promotion ${discountPct}%`,
        type: 'percent',
        value: Number.isFinite(discountPct) ? discountPct : 10,
        status: 'draft',
        configJson: { productIds, source: tool },
      };
    }
    case 'suggestClearancePricing': {
      const productId = String(payload.productId ?? '').trim();
      if (!productId) return null;
      const markdownPct = Number(payload.markdownPct ?? 15);
      return {
        name: `Clearance ${productId}`,
        type: 'percent',
        value: Number.isFinite(markdownPct) ? markdownPct : 15,
        status: 'draft',
        configJson: { productId, currentQty: payload.currentQty, source: tool },
      };
    }
    case 'suggestBundle': {
      const productIds = Array.isArray(payload.productIds) ? payload.productIds.map(String) : [];
      const bundleDiscountPct = Number(payload.bundleDiscountPct ?? 8);
      return {
        name: `Bundle offer (${Math.max(productIds.length, 2)} SKUs)`,
        type: 'percent',
        value: Number.isFinite(bundleDiscountPct) ? bundleDiscountPct : 8,
        status: 'draft',
        configJson: {
          productIds,
          channelHints: payload.channelHints,
          collaborateWith: payload.collaborateWith,
          source: tool,
        },
      };
    }
    case 'suggestCampaignChannel': {
      const theme = String(payload.theme ?? 'seasonal_promo');
      const discountPct = Number(payload.discountPct ?? 10);
      const channel = String(payload.channel ?? 'both');
      return {
        name: `Campaign: ${theme}`,
        type: 'percent',
        value: Number.isFinite(discountPct) ? discountPct : 10,
        status: 'draft',
        configJson: {
          channel,
          theme,
          marginSafe: payload.marginSafe,
          nextAgents: payload.nextAgents,
          source: tool,
        },
      };
    }
    case 'createPromotion': {
      const name = String(payload.name ?? '').trim();
      if (!name) return null;
      const discountPct = Number(payload.discountPct ?? 0);
      const productIds = Array.isArray(payload.productIds) ? payload.productIds.map(String) : [];
      return {
        name,
        type: 'percent',
        value: Number.isFinite(discountPct) ? discountPct : 0,
        status: 'draft',
        configJson: productIds.length ? { productIds, source: tool } : { source: tool },
      };
    }
    default:
      return null;
  }
}

async function persistPromotionProposal(
  ctx: BrainToolContext,
  payload: Record<string, unknown>,
  tool: string,
  createPromotion?: CreatePromotionUseCase
): Promise<ToolExecutionResult> {
  if (!createPromotion) {
    return { success: false, result: '', error: 'CreatePromotionUseCase not available' };
  }
  const input = promotionInputFromPayload(tool, payload);
  if (!input) {
    return { success: false, result: '', error: 'Invalid promotion payload' };
  }
  const result = await createPromotion.execute(ctx.tenantId, input);
  return {
    success: true,
    result: `Promotion draft created: ${result.promotion.id}`,
    operationalMeta: { promotionId: result.promotion.id, tool, ...payload },
  };
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
      return persistPromotionProposal(ctx, payload, 'suggestPromotion', deps.createPromotion);
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
      return persistPromotionProposal(ctx, payload, 'suggestClearancePricing', deps.createPromotion);
    },
  };
}

export function detectMarketingOpportunitiesTool(deps: PromotionToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'detectMarketingOpportunities',
      description:
        'Detect marketing/promo opportunities from low-stock, margin pressure, and demand signals',
      parameters: {
        marginThreshold: {
          type: 'number',
          required: false,
          description: 'Margin % threshold for pressure signal (default 15)',
        },
      },
      risk: 'low',
      kind: 'read',
      module: 'inventory-pricing',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const marginThreshold = Number(input.marginThreshold ?? 15);
      const [lowStock, margins, trends] = await Promise.all([
        deps.adminData.listLowStockInventory(ctx.tenantId, 10),
        deps.adminData.getMarginMetrics(ctx.tenantId, marginThreshold),
        deps.adminData.getOrderTrends(ctx.tenantId, 30),
      ]);

      const opportunities: Array<{
        type: string;
        priority: 'high' | 'medium' | 'low';
        reason: string;
        suggestedIntent: string;
      }> = [];

      if (lowStock.length > 0) {
        opportunities.push({
          type: 'clearance',
          priority: lowStock.length >= 5 ? 'high' : 'medium',
          reason: `${lowStock.length} low-stock SKU(s) — clearance of bundle kans`,
          suggestedIntent: 'CLEARANCE_PRICING',
        });
      }
      if ((margins.lowMarginCount ?? 0) > 0) {
        opportunities.push({
          type: 'margin_aware_campaign',
          priority: 'medium',
          reason: `${margins.lowMarginCount} producten onder marge-drempel — vermijd diepe kortingen`,
          suggestedIntent: 'CAMPAIGN_SUGGEST',
        });
      }
      if (trends.trendPct < -10) {
        opportunities.push({
          type: 'demand_stimulus',
          priority: 'high',
          reason: `Ordertrend ${trends.trendPct}% — e-mail/social stimulatie zinvol`,
          suggestedIntent: 'CAMPAIGN_SUGGEST',
        });
      } else if (trends.trendPct > 10) {
        opportunities.push({
          type: 'bundle_upsell',
          priority: 'medium',
          reason: `Groeiende vraag (${trends.trendPct}%) — bundle/upsell kans`,
          suggestedIntent: 'BUNDLE_SUGGEST',
        });
      }

      return {
        success: true,
        opportunityCount: opportunities.length,
        opportunities,
        marginContext: {
          lowMarginCount: margins.lowMarginCount ?? 0,
          averageMarginPct: margins.marginPct ?? null,
          threshold: marginThreshold,
        },
        demandTrendPct: trends.trendPct,
        message:
          opportunities.length > 0
            ? `${opportunities.length} marketingkans(en) gedetecteerd`
            : 'Geen urgente marketingkansen in huidige signalen',
      };
    },
  };
}

export function suggestBundleTool(deps: PromotionToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'suggestBundle',
      description: 'Propose a product bundle or multi-buy offer, margin-aware',
      parameters: {
        productIds: { type: 'array', required: false, description: 'Candidate product IDs' },
        bundleDiscountPct: {
          type: 'number',
          required: false,
          description: 'Bundle discount % (default 8)',
        },
        reason: { type: 'string', required: false, description: 'Bundle rationale' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'inventory-pricing',
    },
    validate() {
      return { ok: true };
    },
    async executeRead() {
      return { error: 'suggestBundle is propose-only' };
    },
    async buildProposal(ctx, input) {
      const productIds = Array.isArray(input.productIds)
        ? input.productIds.map(String)
        : [];
      const bundleDiscountPct = Number(input.bundleDiscountPct ?? 8);
      const lowStock = await deps.adminData.listLowStockInventory(ctx.tenantId, 5);
      const resolvedIds =
        productIds.length > 0 ? productIds : lowStock.slice(0, 2).map((i) => i.productId);
      const assessment = classifyBrainAction('suggestBundle', input, {
        productCount: resolvedIds.length,
      });
      return {
        tool: 'suggestBundle',
        summary: `Bundle ${bundleDiscountPct}% voor ${resolvedIds.length || 2} SKU(s)`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: 'Bundel kan AOV verhogen zonder diepe single-SKU markdown',
        confidence: assessment.confidence,
        rationale: String(input.reason ?? 'Margin-aware bundle op basis van stock/catalog signalen'),
        payload: {
          productIds: resolvedIds,
          bundleDiscountPct,
          channelHints: ['email', 'storefront'],
          collaborateWith: ['pricing', 'inventory'],
        },
      };
    },
    async executeConfirmed(ctx, payload) {
      return persistPromotionProposal(ctx, payload, 'suggestBundle', deps.createPromotion);
    },
  };
}

export function suggestCampaignChannelTool(deps: PromotionToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'suggestCampaignChannel',
      description: 'Suggest email/social campaign channel and messaging angle for a promo',
      parameters: {
        channel: {
          type: 'string',
          required: false,
          description: 'Preferred channel: email | social | both (default both)',
        },
        theme: { type: 'string', required: false, description: 'Campaign theme' },
        discountPct: { type: 'number', required: false, description: 'Promo depth %' },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'inventory-pricing',
    },
    validate() {
      return { ok: true };
    },
    async executeRead() {
      return { error: 'suggestCampaignChannel is propose-only' };
    },
    async buildProposal(ctx, input) {
      const channelRaw = String(input.channel ?? 'both').toLowerCase();
      const channel = channelRaw === 'email' || channelRaw === 'social' ? channelRaw : 'both';
      const theme = String(input.theme ?? 'seasonal_promo');
      const discountPct = Number(input.discountPct ?? 10);
      const margins = await deps.adminData.getMarginMetrics(ctx.tenantId, 15);
      const marginSafe = discountPct <= 15 || (margins.marginPct ?? 20) > discountPct + 5;
      const assessment = classifyBrainAction('suggestCampaignChannel', input);
      return {
        tool: 'suggestCampaignChannel',
        summary: `${channel} campagne "${theme}" (${discountPct}%)`,
        risk: marginSafe ? assessment.risk : 'high',
        requiresApproval: !marginSafe || assessment.requiresInbox,
        expectedImpact: 'Campagne-concept; uitvoering via mail/copy agents na goedkeuring',
        confidence: marginSafe ? 0.72 : 0.55,
        rationale: marginSafe
          ? 'Korting past binnen margecontext'
          : 'Korting diep t.o.v. marge — goedkeuring vereist',
        payload: {
          channel,
          theme,
          discountPct,
          marginSafe,
          nextAgents: channel === 'email' ? ['mail', 'copy_seo'] : ['copy_seo', 'mail'],
        },
      };
    },
    async executeConfirmed(ctx, payload) {
      return persistPromotionProposal(ctx, payload, 'suggestCampaignChannel', deps.createPromotion);
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
      return persistPromotionProposal(ctx, payload, 'createPromotion', deps.createPromotion);
    },
  };
}
