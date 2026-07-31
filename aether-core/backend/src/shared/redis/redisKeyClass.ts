/** Redis key priority classes for hybrid memory governance. */

export type RedisKeyPriority = 'hot' | 'spillable' | 'ephemeral';

const HOT_PREFIXES = ['rl:', 'rl:sf:'] as const;
const SPILLABLE_PREFIXES = ['aether:runmem:'] as const;

export function classifyRedisKey(key: string): RedisKeyPriority {
  for (const p of HOT_PREFIXES) {
    if (key.startsWith(p)) return 'hot';
  }
  for (const p of SPILLABLE_PREFIXES) {
    if (key.startsWith(p)) return 'spillable';
  }
  return 'ephemeral';
}

export function isHotRedisKey(key: string): boolean {
  return classifyRedisKey(key) === 'hot';
}

export function isSpillableRedisKey(key: string): boolean {
  return classifyRedisKey(key) === 'spillable';
}

export const RUNMEM_SCAN_PATTERN = 'aether:runmem:*';
export const HOT_RL_SCAN_PATTERN = 'rl:*';
