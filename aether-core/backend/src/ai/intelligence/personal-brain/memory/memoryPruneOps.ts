import {
  DEFAULT_INTERACTION_TTL_DAYS,
  DEFAULT_LOW_PRIORITY_MAX_AGE_DAYS,
} from './constants';
import type { LongTermMemoryStore } from './LongTermMemoryStore';

export interface MemoryPruneOpsDeps {
  longTerm: LongTermMemoryStore;
}

export async function pruneLongTerm(
  deps: MemoryPruneOpsDeps,
  tenantId: string
): Promise<number> {
  const now = Date.now();
  const lowMaxAgeMs = DEFAULT_LOW_PRIORITY_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
  const items = await deps.longTerm.listForPrune(tenantId);
  let pruned = 0;

  for (const item of items) {
    let shouldDelete = false;
    if (item.expiresAt && new Date(item.expiresAt).getTime() < now) {
      shouldDelete = true;
    } else if (
      item.priority === 'low' &&
      item.rememberedAt &&
      now - new Date(item.rememberedAt).getTime() > lowMaxAgeMs
    ) {
      shouldDelete = true;
    }
    if (shouldDelete) {
      await deps.longTerm.forget(tenantId, item.id).catch(() => undefined);
      pruned += 1;
    }
  }
  return pruned;
}

export async function pruneInteractionVectors(
  deps: MemoryPruneOpsDeps,
  tenantId: string
): Promise<number> {
  const now = Date.now();
  const maxAgeMs = DEFAULT_INTERACTION_TTL_DAYS * 24 * 60 * 60 * 1000;
  const items = await deps.longTerm.listInteractionVectors(tenantId);
  let pruned = 0;
  for (const item of items) {
    if (!item.rememberedAt) continue;
    if (now - new Date(item.rememberedAt).getTime() > maxAgeMs) {
      await deps.longTerm.forget(tenantId, item.id).catch(() => undefined);
      pruned += 1;
    }
  }
  return pruned;
}
