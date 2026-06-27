import type { AdminDataPort, RestockUpdateItem } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { classifyBrainAction } from '../../personal-brain/tools/ActionRiskClassifier';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';

export interface InventoryToolsDeps {
  adminData: AdminDataPort;
}

export function getInventoryStatusTool(deps: InventoryToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getInventoryStatus',
      description: 'Get inventory overview: SKU count and low-stock summary',
      parameters: {},
      risk: 'low',
      kind: 'read',
      module: 'inventory-pricing',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx) {
      const items = await deps.adminData.listInventoryItems(ctx.tenantId);
      const low = items.filter((i) => i.quantity < 10);
      return {
        success: true,
        totalSkus: items.length,
        lowStockCount: low.length,
        message: `Inventory: ${items.length} SKUs tracked, ${low.length} low-stock`,
      };
    },
  };
}

export function listLowStockTool(deps: InventoryToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'listLowStock',
      description: 'List products with low stock levels',
      parameters: {
        threshold: {
          type: 'number',
          required: false,
          description: 'Quantity threshold (default 10)',
        },
        limit: { type: 'number', required: false, description: 'Max items (default 20)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'inventory-pricing',
    },
    validate(input) {
      const threshold = Number(input.threshold ?? 10);
      if (!Number.isFinite(threshold) || threshold < 0) {
        return { ok: false, error: 'threshold must be >= 0' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const threshold = Number(input.threshold ?? 10);
      const limit = Math.min(Number(input.limit ?? 20), 50);
      const items = await deps.adminData.listLowStockInventory(ctx.tenantId, threshold);
      return {
        success: true,
        threshold,
        count: items.length,
        items: items.slice(0, limit),
      };
    },
  };
}

const DEFAULT_RESTOCK_TARGET = 25;

function normalizeRestockItems(
  raw: unknown,
  lowStock: Array<{ id: string; productId: string; quantity: number; warehouseId: string }>
): RestockUpdateItem[] {
  if (Array.isArray(raw) && raw.length > 0) {
    return raw
      .map((entry) => {
        const row = entry as Record<string, unknown>;
        const currentQty = Number(row.currentQty ?? row.quantity ?? 0);
        const suggestedQty = Number(row.suggestedQty ?? row.targetQty ?? DEFAULT_RESTOCK_TARGET);
        return {
          id: String(row.id ?? ''),
          productId: String(row.productId ?? ''),
          warehouseId: String(row.warehouseId ?? 'default'),
          currentQty,
          suggestedQty,
        };
      })
      .filter((item) => item.id && item.productId && item.suggestedQty > item.currentQty);
  }

  return lowStock.slice(0, 10).map((item) => ({
    id: item.id,
    productId: item.productId,
    warehouseId: item.warehouseId,
    currentQty: item.quantity,
    suggestedQty: Math.max(item.quantity + 10, DEFAULT_RESTOCK_TARGET),
  }));
}

export function suggestRestockTool(deps: InventoryToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'suggestRestock',
      description: 'Propose restocking low-stock inventory items to target quantities',
      parameters: {
        threshold: {
          type: 'number',
          required: false,
          description: 'Low-stock threshold for auto-selection (default 10)',
        },
        items: {
          type: 'array',
          required: false,
          description: 'Explicit restock line items with suggestedQty',
        },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'inventory-pricing',
    },
    validate(input) {
      const threshold = Number(input.threshold ?? 10);
      if (!Number.isFinite(threshold) || threshold < 0) {
        return { ok: false, error: 'threshold must be >= 0' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'suggestRestock is propose-only' };
    },
    async buildProposal(ctx, input) {
      const threshold = Number(input.threshold ?? 10);
      const lowStock = await deps.adminData.listLowStockInventory(ctx.tenantId, threshold);
      const items = normalizeRestockItems(input.items, lowStock);
      const totalDelta = items.reduce((sum, item) => sum + (item.suggestedQty - item.currentQty), 0);
      const assessment = classifyBrainAction('suggestRestock', input, { productCount: items.length });
      return {
        tool: 'suggestRestock',
        summary: `Voorraad aanvullen voor ${items.length} SKU(s) (+${totalDelta} eenheden)`,
        risk: assessment.risk,
        requiresApproval: assessment.requiresInbox,
        expectedImpact: assessment.expectedImpact,
        confidence: assessment.confidence,
        rationale: assessment.rationale,
        payload: { items, threshold, totalDelta },
      };
    },
    async executeConfirmed(ctx, payload) {
      const items = normalizeRestockItems((payload as { items?: unknown }).items, []);
      const updated = await deps.adminData.applyRestockUpdates(ctx.tenantId, items);
      return {
        success: true,
        result: `Restocked ${updated} SKU(s)`,
        updated,
        itemCount: items.length,
      };
    },
  };
}
