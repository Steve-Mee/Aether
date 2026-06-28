import type { ProactiveFinding } from '../ProactiveTriggerDefinition';
import { isProactiveCrossDedupeEnabled } from '../proactiveConfig';

const INVENTORY = 'inventory.low_stock';
const MARGIN = 'pricing.margin_decline';
const SUPPLIER = 'supplier.price_drop';

function extractProductIds(evidence: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const skus = evidence.lowStockSkus;
  if (Array.isArray(skus)) {
    for (const item of skus) {
      if (item && typeof item === 'object' && 'productId' in item) {
        const pid = String((item as { productId: unknown }).productId);
        if (pid) ids.add(pid);
      }
    }
  }
  const raw = evidence.productIds;
  if (Array.isArray(raw)) {
    for (const id of raw) {
      if (typeof id === 'string' && id) ids.add(id);
    }
  }
  return [...ids];
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function mergeInventoryMargin(
  inventory: ProactiveFinding,
  margin: ProactiveFinding
): ProactiveFinding {
  const invIds = extractProductIds(inventory.evidence);
  const marginCount = Number(margin.evidence.lowMarginCount ?? 0);
  const stockCount = Number(inventory.evidence.lowStockCount ?? invIds.length);
  const clusterKey = `cluster:stock_margin:${todayKey()}`;
  const sharedIds = invIds.slice(0, 5);

  return {
    triggerId: INVENTORY,
    dedupeKey: `cluster.stock_margin:${todayKey()}`,
    agentKey: 'inventory',
    title:
      stockCount > 0 && marginCount > 0
        ? `Voorraad én marge onder druk (${stockCount} SKU's) — clearance of prijsoptimalisatie?`
        : inventory.title,
    summary: 'Gecombineerd signaal: lage voorraad en lage marge.',
    command: 'Toon low-stock producten met lage marge en stel clearance of prijsoptimalisatie voor',
    intentId: 'RESTOCK_SUGGEST',
    category: 'voorraad',
    riskLevel: margin.riskLevel === 'medium' || inventory.riskLevel === 'medium' ? 'medium' : 'low',
    executionMode:
      margin.executionMode === 'approval_required' ? 'approval_required' : inventory.executionMode,
    priority: Math.max(inventory.priority, margin.priority) + 1,
    clusterKey,
    evidence: {
      ...inventory.evidence,
      lowMarginCount: marginCount,
      sharedProductIds: sharedIds,
      mergedTriggers: [INVENTORY, MARGIN],
    },
  };
}

export class CrossTriggerDedupeService {
  normalize(findings: ProactiveFinding[]): ProactiveFinding[] {
    if (!isProactiveCrossDedupeEnabled() || findings.length <= 1) {
      return findings.map((f) => ({
        ...f,
        clusterKey: f.clusterKey ?? `cluster:${f.triggerId}:${todayKey()}`,
      }));
    }

    const byTrigger = new Map<string, ProactiveFinding>();
    for (const f of findings) {
      byTrigger.set(f.triggerId, f);
    }

    const suppressed = new Set<string>();
    const merged: ProactiveFinding[] = [];

    const inventory = byTrigger.get(INVENTORY);
    const margin = byTrigger.get(MARGIN);
    if (inventory && margin) {
      const invIds = extractProductIds(inventory.evidence);
      const hasOverlap = invIds.length > 0;
      if (hasOverlap || invIds.length === 0) {
        merged.push(mergeInventoryMargin(inventory, margin));
        suppressed.add(INVENTORY);
        suppressed.add(MARGIN);
      }
    }

    const supplier = byTrigger.get(SUPPLIER);
    if (supplier && margin && !suppressed.has(MARGIN)) {
      const supplierId = String(supplier.evidence.supplierId ?? '');
      if (supplierId) {
        suppressed.add(MARGIN);
        suppressed.add(SUPPLIER);
        merged.push({
          ...supplier,
          clusterKey: `cluster:supplier:${supplierId}:${todayKey()}`,
          priority: Math.max(supplier.priority, margin.priority),
        });
      }
    }

    for (const f of findings) {
      if (suppressed.has(f.triggerId)) continue;
      merged.push({
        ...f,
        clusterKey: f.clusterKey ?? `cluster:${f.triggerId}:${todayKey()}`,
      });
    }

    return merged;
  }

  /** Keep highest-priority record per clusterKey when listing. */
  mergeActive<T extends { clusterKey?: string | null; priority: number; id: string }>(
    records: T[]
  ): T[] {
    if (!isProactiveCrossDedupeEnabled()) return records;

    const byCluster = new Map<string, T>();
    const unclustered: T[] = [];

    for (const r of records) {
      const key = r.clusterKey;
      if (!key) {
        unclustered.push(r);
        continue;
      }
      const existing = byCluster.get(key);
      if (!existing || r.priority > existing.priority) {
        byCluster.set(key, r);
      }
    }

    return [...byCluster.values(), ...unclustered].sort((a, b) => b.priority - a.priority);
  }
}

export const crossTriggerDedupeService = new CrossTriggerDedupeService();
