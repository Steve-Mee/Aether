/** Canonical shared-memory keys in the `shared` namespace. */
export const SHARED_MEMORY_KEYS = {
  priceDrops: 'priceDrops',
  lowStockSkus: 'lowStockSkus',
  suggestedPricingActions: 'suggestedPricingActions',
  recentDecisions: 'recentDecisions',
  businessSnapshot: 'businessSnapshot',
  agentContributions: 'agentContributions',
  churnSignals: 'churnSignals',
  customerSegments: 'customerSegments',
} as const;

export type SharedMemoryKey = (typeof SHARED_MEMORY_KEYS)[keyof typeof SHARED_MEMORY_KEYS];

export interface PriceDropIntel {
  supplierId?: string;
  productId?: string;
  sku?: string;
  previousPrice?: number;
  currentPrice?: number;
  changePct?: number;
  detectedAt?: string;
}

export interface LowStockEntry {
  productId?: string;
  sku?: string;
  quantity?: number;
  threshold?: number;
}

export interface PricingAction {
  productId?: string;
  sku?: string;
  action?: string;
  suggestedPrice?: number;
  reason?: string;
  sourceAgent?: string;
}

export interface DecisionRecord {
  from: string;
  intent?: string;
  summary?: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface BusinessSnapshot {
  updatedAt: string;
  byAgent: string;
  agentCount?: number;
  keys?: string[];
}

export interface AgentContributionRecord {
  agentKey: string;
  summary: string;
  status: string;
}

export interface ChurnSignalsIntel {
  atRiskCount?: number;
  decliningTrend?: boolean;
  trendPct?: number;
  cancelledOrRefundedRatio?: number;
  atRiskCustomers?: Array<{ id: string; email: string; name: string; daysSinceLastOrder?: number }>;
  suggestedActions?: string[];
  updatedAt?: string;
}

export interface CustomerSegmentsIntel {
  vip?: number;
  atRisk?: number;
  new?: number;
  regular?: number;
  total?: number;
  updatedAt?: string;
}

const SHARED_KEY_SET = new Set<string>(Object.values(SHARED_MEMORY_KEYS));

export function isSharedMemoryKey(key: string): key is SharedMemoryKey {
  return SHARED_KEY_SET.has(key);
}

export function validateSharedMemoryValue(
  key: string,
  value: unknown
): { ok: true } | { ok: false; error: string } {
  if (!isSharedMemoryKey(key)) {
    return { ok: true };
  }

  switch (key) {
    case SHARED_MEMORY_KEYS.priceDrops:
    case SHARED_MEMORY_KEYS.lowStockSkus:
    case SHARED_MEMORY_KEYS.suggestedPricingActions:
    case SHARED_MEMORY_KEYS.recentDecisions:
    case SHARED_MEMORY_KEYS.agentContributions:
      if (!Array.isArray(value)) {
        return { ok: false, error: `${key} must be an array` };
      }
      return { ok: true };
    case SHARED_MEMORY_KEYS.churnSignals:
    case SHARED_MEMORY_KEYS.customerSegments:
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { ok: false, error: `${key} must be an object` };
      }
      return { ok: true };
    case SHARED_MEMORY_KEYS.businessSnapshot:
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        return { ok: false, error: 'businessSnapshot must be an object' };
      }
      return { ok: true };
    default:
      return { ok: true };
  }
}

export interface NormalizedSharedWrite {
  namespace: 'shared';
  key: SharedMemoryKey;
  value: unknown;
  mode: 'set' | 'merge' | 'append';
}

/** Map peer contextPayload fields to canonical shared-memory keys. */
export function normalizePeerPayloadToSharedKey(
  sourceAgent: string,
  payload: Record<string, unknown> | undefined
): NormalizedSharedWrite[] {
  if (!payload || typeof payload !== 'object') return [];

  const writes: NormalizedSharedWrite[] = [];

  if (Array.isArray(payload.priceDrops)) {
    writes.push({
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.priceDrops,
      value: payload.priceDrops,
      mode: 'merge',
    });
  }
  if (Array.isArray(payload.lowStockSkus)) {
    writes.push({
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.lowStockSkus,
      value: payload.lowStockSkus,
      mode: 'set',
    });
  }
  if (Array.isArray(payload.suggestedPricingActions)) {
    writes.push({
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.suggestedPricingActions,
      value: payload.suggestedPricingActions,
      mode: 'merge',
    });
  }
  if (payload.churnSignals !== undefined && typeof payload.churnSignals === 'object') {
    writes.push({
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.churnSignals,
      value: payload.churnSignals,
      mode: 'set',
    });
  }
  if (payload.customerSegments !== undefined && typeof payload.customerSegments === 'object') {
    writes.push({
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.customerSegments,
      value: payload.customerSegments,
      mode: 'set',
    });
  }

  const hasKnownKeys =
    payload.priceDrops !== undefined ||
    payload.lowStockSkus !== undefined ||
    payload.suggestedPricingActions !== undefined ||
    payload.churnSignals !== undefined ||
    payload.customerSegments !== undefined;

  if (!hasKnownKeys && Object.keys(payload).length > 0) {
    writes.push({
      namespace: 'shared',
      key: SHARED_MEMORY_KEYS.recentDecisions,
      value: {
        from: sourceAgent,
        timestamp: new Date().toISOString(),
        payload,
      },
      mode: 'append',
    });
  }

  return writes;
}
