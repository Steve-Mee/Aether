import { SHARED_MEMORY_KEYS } from './sharedMemorySchema';

/** Keys promoted from run → merchant at end of successful multi-agent run. */
export const MERCHANT_PROMOTE_KEYS: Record<string, readonly string[]> = {
  shared: Object.values(SHARED_MEMORY_KEYS),
  pricing: ['marginAnalysis', 'priceProposals'],
  inventory: ['stockLevels'],
};

export function shouldPromoteKey(namespace: string, key: string): boolean {
  const allowed = MERCHANT_PROMOTE_KEYS[namespace];
  if (!allowed) return false;
  return allowed.includes(key);
}

export function listPromotableNamespaces(): string[] {
  return Object.keys(MERCHANT_PROMOTE_KEYS);
}

/** High-value shared keys for optional dual-write from bridge. */
export const MERCHANT_DUAL_WRITE_SHARED_KEYS: readonly string[] = [
  SHARED_MEMORY_KEYS.priceDrops,
  SHARED_MEMORY_KEYS.lowStockSkus,
  SHARED_MEMORY_KEYS.suggestedPricingActions,
];

export function shouldDualWriteToMerchant(namespace: string, key: string): boolean {
  return namespace === 'shared' && MERCHANT_DUAL_WRITE_SHARED_KEYS.includes(key);
}
