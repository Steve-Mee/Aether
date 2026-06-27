import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface SupplierToolsDeps {
  adminData: AdminDataPort;
}

/** Deterministic cost ratio for margin comparison (matches pricingTools default). */
const DEFAULT_COST_RATIO = 0.6;

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function getSupplierPriceIntelTool(deps: SupplierToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getSupplierPriceIntel',
      description:
        'Fetch supplier price intelligence: registered suppliers, simulated recent cost changes, and suggested pricing actions',
      parameters: {
        limit: { type: 'number', required: false, description: 'Max products to analyze (default 20)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'supplier-intelligence',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const limit = Math.min(Number(input.limit ?? 20), 50);
      const suppliers = await deps.adminData.listSuppliers(ctx.tenantId, 20);
      const products = await deps.adminData.listProductsForBrain(ctx.tenantId, 100);

      const recentChanges = products.slice(0, limit).map((p, idx) => {
        const seed = hashSeed(`${ctx.tenantId}:${p.id}:${suppliers.length}`);
        const changePct = ((seed % 11) - 5) * 0.5;
        const previousCost = p.price * DEFAULT_COST_RATIO;
        const newCost = previousCost * (1 + changePct / 100);
        return {
          productId: p.id,
          productName: p.name,
          currentPrice: p.price,
          estimatedCostChangePct: Math.round(changePct * 10) / 10,
          previousEstimatedCost: Math.round(previousCost * 100) / 100,
          newEstimatedCost: Math.round(newCost * 100) / 100,
          supplierIndex: suppliers.length > 0 ? idx % suppliers.length : null,
        };
      });

      const priceDrops = recentChanges.filter((c) => c.estimatedCostChangePct < -0.5);
      const priceRises = recentChanges.filter((c) => c.estimatedCostChangePct > 0.5);

      const suggestedPricingActions = priceDrops.slice(0, 5).map((c) => ({
        productId: c.productId,
        productName: c.productName,
        action: 'review_price_decrease_opportunity' as const,
        reason: `Estimated supplier cost down ${Math.abs(c.estimatedCostChangePct)}%`,
      }));

      return {
        success: true,
        supplierCount: suppliers.length,
        suppliers: suppliers.map((s) => ({ id: s.id })),
        productsAnalyzed: recentChanges.length,
        recentChanges,
        summary: {
          priceDrops: priceDrops.length,
          priceRises: priceRises.length,
        },
        suggestedPricingActions,
      };
    },
  };
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
