import { isSharedMemoryKey, SHARED_MEMORY_KEYS } from './sharedMemorySchema';

export type MemoryScope = 'run' | 'merchant';

export const RUN_MEMORY_MAX_KEYS = 50;
export const RUN_MEMORY_PROMPT_MAX_CHARS = 2000;
export const MERCHANT_MEMORY_PROMPT_MAX_CHARS = 1000;

const HOUR = 3_600_000;
const DAY = 86_400_000;

export function runMemoryCacheTtlMs(): number {
  const raw = process.env.MULTI_AGENT_RUN_MEMORY_CACHE_TTL_MS;
  const n = raw ? Number(raw) : 2000;
  return Number.isFinite(n) && n >= 0 ? n : 2000;
}

export function isRunMemoryEnabled(): boolean {
  if (process.env.MULTI_AGENT_RUN_MEMORY === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.MULTI_AGENT_RUN_MEMORY !== 'true') {
    return false;
  }
  return true;
}

export function isMerchantMemoryEnabled(): boolean {
  if (!isRunMemoryEnabled()) return false;
  if (process.env.MULTI_AGENT_MERCHANT_MEMORY === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.MULTI_AGENT_MERCHANT_MEMORY !== 'true') {
    return false;
  }
  return true;
}

export function isMerchantMemoryPromoteEnabled(): boolean {
  return isMerchantMemoryEnabled() && process.env.MULTI_AGENT_MERCHANT_MEMORY_PROMOTE !== 'false';
}

export function isMerchantMemoryDualWriteEnabled(): boolean {
  return isMerchantMemoryEnabled() && process.env.MULTI_AGENT_MERCHANT_MEMORY_DUAL_WRITE === 'true';
}

export function isRunMemoryGcEnabled(): boolean {
  return process.env.RUN_MEMORY_GC_ENABLED === 'true';
}

export function isRunMemoryRedisCacheEnabled(): boolean {
  return process.env.RUN_MEMORY_REDIS_CACHE === 'true' && Boolean(process.env.REDIS_URL);
}

export function runMemoryGcIntervalMs(): number {
  const n = Number(process.env.RUN_MEMORY_GC_INTERVAL_MS ?? 3_600_000);
  return Number.isFinite(n) && n > 0 ? n : 3_600_000;
}

export function defaultRunMemoryTtlMs(): number {
  const n = Number(process.env.RUN_MEMORY_RUN_TTL_MS ?? DAY);
  return Number.isFinite(n) && n > 0 ? n : DAY;
}

export function defaultMerchantMemoryTtlMs(): number {
  const n = Number(process.env.MERCHANT_MEMORY_TTL_MS ?? 7 * DAY);
  return Number.isFinite(n) && n > 0 ? n : 7 * DAY;
}

export function runMemoryMaxAgeMs(): number {
  const n = Number(process.env.RUN_MEMORY_MAX_AGE_MS ?? 30 * DAY);
  return Number.isFinite(n) && n > 0 ? n : 30 * DAY;
}

const RUN_KEY_TTL_MS: Record<string, number> = {
  [SHARED_MEMORY_KEYS.recentDecisions]: 2 * DAY,
  [SHARED_MEMORY_KEYS.agentContributions]: 12 * HOUR,
  [SHARED_MEMORY_KEYS.businessSnapshot]: 12 * HOUR,
};

const MERCHANT_KEY_TTL_MS: Record<string, number> = {
  [SHARED_MEMORY_KEYS.priceDrops]: 7 * DAY,
  [SHARED_MEMORY_KEYS.lowStockSkus]: 3 * DAY,
  [SHARED_MEMORY_KEYS.suggestedPricingActions]: 7 * DAY,
  [SHARED_MEMORY_KEYS.recentDecisions]: 14 * DAY,
  marginAnalysis: 7 * DAY,
  priceProposals: 7 * DAY,
  stockLevels: 3 * DAY,
};

/** Compute expiresAt for a memory entry. */
export function memoryExpiresAt(
  scope: MemoryScope,
  namespace: string,
  key: string,
  from = Date.now()
): Date {
  let ttlMs: number;
  if (scope === 'merchant') {
    ttlMs = MERCHANT_KEY_TTL_MS[key] ?? defaultMerchantMemoryTtlMs();
  } else {
    ttlMs = namespace === 'shared' ? (RUN_KEY_TTL_MS[key] ?? defaultRunMemoryTtlMs()) : defaultRunMemoryTtlMs();
  }
  return new Date(from + ttlMs);
}

/** Keys agents may write via writeRunMemory tool (per agentKey). */
export const RUN_MEMORY_WRITE_SCOPE: Record<string, readonly string[]> = {
  shared: ['*'],
  pricing: ['marginAnalysis', 'priceProposals', 'productId'],
  inventory: ['lowStockSkus', 'stockLevels', 'suggestedPricingActions'],
  customer: ['churnSignals', 'customerSegments', 'demandSignal'],
  supplier: ['suggestedPricingActions', 'priceDrops'],
  promotion: ['promotionProposals', 'clearanceCandidates', 'campaignDraft'],
  negotiation: ['currentOffer', 'roundState', 'counterHistory'],
  workflow_supervisor: ['subPlan', 'synthesis', 'agentContributions'],
};

/** Shared-namespace keys each agent may write (when namespace=shared). */
export const RUN_MEMORY_SHARED_WRITE_SCOPE: Record<string, readonly string[]> = {
  pricing: ['suggestedPricingActions', 'priceProposals', 'businessSnapshot', 'agentContributions'],
  inventory: ['lowStockSkus', 'suggestedPricingActions', 'stockLevels'],
  customer: ['churnSignals', 'customerSegments', 'agentContributions'],
  supplier: ['priceDrops', 'suggestedPricingActions'],
  promotion: ['suggestedPricingActions', 'agentContributions'],
  negotiation: ['recentDecisions'],
  workflow_supervisor: ['businessSnapshot', 'agentContributions', 'synthesis'],
};

/** Merchant scope uses same write rules as run scope when enabled. */
export const MERCHANT_MEMORY_WRITE_SCOPE = RUN_MEMORY_SHARED_WRITE_SCOPE;

/** Cross-namespace read: agentKey → namespaces it may read beyond shared + own. */
export const RUN_MEMORY_READ_SCOPE: Record<string, readonly string[]> = {
  pricing: ['supplier', 'inventory', 'promotion', 'customer'],
  promotion: ['inventory', 'pricing'],
  inventory: ['supplier', 'customer'],
  workflow_supervisor: ['*'],
};

export function canWriteRunMemoryKey(
  agentKey: string,
  namespace: string,
  key: string,
  scope: MemoryScope = 'run'
): boolean {
  if (scope === 'merchant' && !isMerchantMemoryEnabled()) return false;
  if (namespace === 'shared') {
    const agentShared = RUN_MEMORY_SHARED_WRITE_SCOPE[agentKey];
    if (agentShared) {
      if (agentShared.includes('*')) return true;
      if (isSharedMemoryKey(key) && agentShared.includes(key)) return true;
    }
    const sharedAllowed = RUN_MEMORY_WRITE_SCOPE.shared;
    return sharedAllowed.includes('*') || sharedAllowed.includes(key);
  }
  if (namespace !== agentKey) {
    return false;
  }
  const allowed = RUN_MEMORY_WRITE_SCOPE[agentKey];
  if (!allowed) return true;
  if (allowed.includes('*')) return true;
  return allowed.includes(key);
}

export function canReadRunMemoryKey(agentKey: string, namespace: string, _key: string): boolean {
  if (namespace === 'shared') return true;
  if (namespace === agentKey) return true;

  const crossRead = RUN_MEMORY_READ_SCOPE[agentKey];
  if (!crossRead) return false;
  if (crossRead.includes('*')) return true;
  return crossRead.includes(namespace);
}

export function canListRunMemoryNamespace(agentKey: string, namespace: string): boolean {
  if (namespace === 'shared') return true;
  if (namespace === agentKey) return true;

  const crossRead = RUN_MEMORY_READ_SCOPE[agentKey];
  if (!crossRead) return false;
  if (crossRead.includes('*')) return true;
  return crossRead.includes(namespace);
}

/** Namespaces visible in buildPromptBlock for an agent. */
export function readableNamespacesForAgent(agentKey: string): string[] {
  const ns = new Set<string>(['shared', agentKey]);
  const crossRead = RUN_MEMORY_READ_SCOPE[agentKey];
  if (crossRead) {
    for (const n of crossRead) {
      if (n !== '*') ns.add(n);
    }
  }
  return [...ns];
}

export function runMemoryRedisTtlSec(): number {
  const n = Number(process.env.RUN_MEMORY_REDIS_TTL_SEC ?? 30);
  return Number.isFinite(n) && n > 0 ? n : 30;
}
