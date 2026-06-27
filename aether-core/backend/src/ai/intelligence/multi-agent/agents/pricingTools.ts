import type { DynamicPricingEngine } from '../../../../modules/inventory-pricing/application/services/DynamicPricingEngine';
import type { BrainToolExecutor, PersonalBrainToolRegistryDeps } from '../../personal-brain/tools/types';

const DEFAULT_COST_RATIO = 0.6;
const DEFAULT_MARGIN_THRESHOLD = 25;

function marginPercent(price: number, costRatio = DEFAULT_COST_RATIO): number {
  const cost = price * costRatio;
  if (price <= 0) return 0;
  return Math.round(((price - cost) / price) * 100);
}

export interface PricingToolsDeps extends PersonalBrainToolRegistryDeps {
  dynamicPricingEngine?: DynamicPricingEngine;
}

export function analyzeMarginsTool(deps: PricingToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'analyzeMargins',
      description: 'Analyze product margins and list low-margin products',
      parameters: {
        threshold: {
          type: 'number',
          required: false,
          description: 'Margin threshold percentage (default 25)',
        },
        limit: { type: 'number', required: false, description: 'Max products to return (default 20)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'inventory-pricing',
    },
    validate(input) {
      const threshold = Number(input.threshold ?? DEFAULT_MARGIN_THRESHOLD);
      if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
        return { ok: false, error: 'threshold must be between 0 and 100' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const threshold = Number(input.threshold ?? DEFAULT_MARGIN_THRESHOLD);
      const limit = Math.min(Number(input.limit ?? 20), 50);
      const products = await deps.adminData.listProductsForBrain(ctx.tenantId, 100);
      const analyzed = products.map((p) => ({
        id: p.id,
        name: p.name,
        price: p.price,
        marginPercent: marginPercent(p.price),
        stock: p.stock,
      }));
      const lowMargin = analyzed.filter((p) => p.marginPercent < threshold).slice(0, limit);
      const count = await deps.adminData.countLowMarginProducts(ctx.tenantId, threshold);
      return {
        success: true,
        threshold,
        lowMarginCount: count,
        products: lowMargin,
        totalAnalyzed: products.length,
      };
    },
  };
}

export function suggestOptimalPriceTool(deps: PricingToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'suggestOptimalPrice',
      description: 'Suggest optimal price for a product using pricing rules',
      parameters: {
        product: { type: 'string', required: true, description: 'Product name or search term' },
        productId: { type: 'string', required: false, description: 'Product ID if known' },
      },
      risk: 'low',
      kind: 'read',
      module: 'inventory-pricing',
    },
    validate(input) {
      if (!String(input.product ?? input.productId ?? '').trim()) {
        return { ok: false, error: 'product or productId is required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      let productId = String(input.productId ?? '').trim();
      let productName = '';
      let basePrice = 0;

      if (productId) {
        const hits = await deps.adminData.searchProductsByName(ctx.tenantId, productId, 1);
        if (hits.length > 0) {
          productName = hits[0].name;
          basePrice = hits[0].price;
          productId = hits[0].id;
        }
      } else {
        const query = String(input.product ?? '');
        const hits = await deps.adminData.searchProductsByName(ctx.tenantId, query, 1);
        if (hits.length === 0) {
          return { success: false, error: 'Product not found' };
        }
        productId = hits[0].id;
        productName = hits[0].name;
        basePrice = hits[0].price;
      }

      if (!productId || basePrice <= 0) {
        return { success: false, error: 'Product not found or invalid price' };
      }

      let suggestedPrice = basePrice;
      if (deps.dynamicPricingEngine) {
        suggestedPrice = await deps.dynamicPricingEngine.calculateOptimalPrice(
          ctx.tenantId,
          productId,
          basePrice
        );
      } else {
        const margin = marginPercent(basePrice);
        if (margin < DEFAULT_MARGIN_THRESHOLD) {
          suggestedPrice = Math.round((basePrice / (1 - DEFAULT_MARGIN_THRESHOLD / 100)) * 100) / 100;
        }
      }

      const changePct =
        basePrice > 0 ? Math.round(((suggestedPrice - basePrice) / basePrice) * 1000) / 10 : 0;

      return {
        success: true,
        productId,
        productName,
        currentPrice: basePrice,
        suggestedPrice,
        changePercent: changePct,
        currentMarginPercent: marginPercent(basePrice),
        suggestedMarginPercent: marginPercent(suggestedPrice),
      };
    },
  };
}
