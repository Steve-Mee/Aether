import { SHARED_MEMORY_KEYS } from './sharedMemorySchema';

export type MergeStrategyKind =
  | 'lww'
  | 'mergeById'
  | 'appendUnique'
  | 'deepMerge';

export function mergeStrategyForKey(namespace: string, key: string): MergeStrategyKind {
  if (namespace === 'shared') {
    switch (key) {
      case SHARED_MEMORY_KEYS.priceDrops:
      case SHARED_MEMORY_KEYS.lowStockSkus:
      case SHARED_MEMORY_KEYS.suggestedPricingActions:
        return 'mergeById';
      case SHARED_MEMORY_KEYS.recentDecisions:
        return 'appendUnique';
      default:
        return 'lww';
    }
  }
  if (namespace === 'pricing' && (key === 'marginAnalysis' || key === 'priceProposals')) {
    return 'deepMerge';
  }
  return 'lww';
}

function entityId(item: unknown): string | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as Record<string, unknown>;
  if (o.sku != null) return `sku:${String(o.sku)}`;
  if (o.productId != null) return `product:${String(o.productId)}`;
  if (o.supplierId != null) return `supplier:${String(o.supplierId)}`;
  return null;
}

function timestampOf(item: unknown): number {
  if (!item || typeof item !== 'object') return 0;
  const o = item as Record<string, unknown>;
  const ts = o.detectedAt ?? o.timestamp ?? o.updatedAt;
  if (typeof ts === 'string') return Date.parse(ts) || 0;
  return 0;
}

function mergeById(existing: unknown, incoming: unknown): unknown {
  const existingArr = Array.isArray(existing) ? existing : [];
  const incomingArr = Array.isArray(incoming) ? incoming : [incoming];
  const map = new Map<string, unknown>();

  for (const item of existingArr) {
    const id = entityId(item);
    if (id) map.set(id, item);
  }
  for (const item of incomingArr) {
    const id = entityId(item) ?? `_anon:${JSON.stringify(item).slice(0, 40)}`;
    const prev = map.get(id);
    if (!prev || timestampOf(item) >= timestampOf(prev)) {
      map.set(id, item);
    }
  }
  return [...map.values()];
}

function appendUnique(existing: unknown, incoming: unknown): unknown {
  const existingArr = Array.isArray(existing) ? [...existing] : [];
  const incomingArr = Array.isArray(incoming) ? incoming : [incoming];
  const seen = new Set(
    existingArr.map((i) => {
      if (i && typeof i === 'object') {
        const o = i as Record<string, unknown>;
        return `${o.from}:${o.timestamp}`;
      }
      return JSON.stringify(i);
    })
  );
  for (const item of incomingArr) {
    const key =
      item && typeof item === 'object'
        ? `${(item as Record<string, unknown>).from}:${(item as Record<string, unknown>).timestamp}`
        : JSON.stringify(item);
    if (!seen.has(key)) {
      seen.add(key);
      existingArr.push(item);
    }
  }
  return existingArr;
}

function deepMergeObjects(existing: unknown, incoming: unknown): unknown {
  if (
    existing &&
    typeof existing === 'object' &&
    !Array.isArray(existing) &&
    typeof incoming === 'object' &&
    incoming !== null &&
    !Array.isArray(incoming)
  ) {
    return { ...(existing as Record<string, unknown>), ...(incoming as Record<string, unknown>) };
  }
  return incoming;
}

/** Strategy-based merge for shared memory keys. */
export function mergeByStrategy(
  namespace: string,
  key: string,
  existing: unknown,
  incoming: unknown
): unknown {
  const strategy = mergeStrategyForKey(namespace, key);
  switch (strategy) {
    case 'mergeById':
      return mergeById(existing, incoming);
    case 'appendUnique':
      return appendUnique(existing, incoming);
    case 'deepMerge':
      return deepMergeObjects(existing, incoming);
    case 'lww':
    default:
      if (Array.isArray(existing) && Array.isArray(incoming)) {
        return [...existing, ...incoming];
      }
      if (
        existing &&
        typeof existing === 'object' &&
        !Array.isArray(existing) &&
        typeof incoming === 'object' &&
        incoming !== null &&
        !Array.isArray(incoming)
      ) {
        return deepMergeObjects(existing, incoming);
      }
      return incoming;
  }
}
