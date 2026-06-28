import type { ProactiveTriggerDefinition } from '../ProactiveTriggerDefinition';
import { PROACTIVE_DEFAULT_COOLDOWN_MS, PROACTIVE_LOW_STOCK_THRESHOLD } from '../proactiveConfig';

export const lowStockTrigger: ProactiveTriggerDefinition = {
  id: 'inventory.low_stock',
  agentKey: 'inventory',
  category: 'voorraad',
  mode: 'event',
  eventType: 'inventory.low_stock_detected',
  defaultRiskLevel: 'low',
  cooldownMs: PROACTIVE_DEFAULT_COOLDOWN_MS,
  async evaluate(ctx) {
    const payload = ctx.eventPayload;
    if (payload) {
      const count = Number(payload.lowStockCount ?? 0);
      if (count <= 0) return [];
      const lowStockSkus = (payload.lowStockSkus as unknown[]) ?? [];
      return [
        {
          triggerId: 'inventory.low_stock',
          dedupeKey: `inventory.low_stock:batch:${new Date().toISOString().slice(0, 10)}`,
          agentKey: 'inventory',
          title:
            count === 1
              ? '1 SKU onder voorraaddrempel — herbevoorrading of clearance?'
              : `${count} SKU's onder voorraaddrempel — herbevoorrading of clearance?`,
          summary: 'Inventory Agent detecteerde lage voorraad.',
          command: 'Toon low-stock producten en stel restock of promotie voor',
          intentId: 'RESTOCK_SUGGEST',
          category: 'voorraad',
          riskLevel: 'low',
          executionMode: 'autonomous',
          priority: 8,
          evidence: { lowStockCount: count, lowStockSkus: lowStockSkus.slice(0, 10) },
        },
      ];
    }

    const items = await ctx.adminData.listLowStockInventory(
      ctx.tenantId,
      PROACTIVE_LOW_STOCK_THRESHOLD
    );
    if (items.length === 0) return [];

    return [
      {
        triggerId: 'inventory.low_stock',
        dedupeKey: `inventory.low_stock:batch:${new Date().toISOString().slice(0, 10)}`,
        agentKey: 'inventory',
        title:
          items.length === 1
            ? '1 SKU onder voorraaddrempel — herbevoorrading of clearance?'
            : `${items.length} SKU's onder voorraaddrempel — herbevoorrading of clearance?`,
        summary: 'Inventory Agent detecteerde lage voorraad.',
        command: 'Toon low-stock producten en stel restock of promotie voor',
        intentId: 'RESTOCK_SUGGEST',
        category: 'voorraad',
        riskLevel: 'low',
        executionMode: 'autonomous',
        priority: 8,
        evidence: {
          lowStockCount: items.length,
          lowStockSkus: items.slice(0, 10).map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
          })),
        },
      },
    ];
  },
};
