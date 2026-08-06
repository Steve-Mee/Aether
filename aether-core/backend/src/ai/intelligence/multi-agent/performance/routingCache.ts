import type { RouteDecision } from '../types';

export type { RouteDecision };

export interface RoutingCache {
  get(key: string): RouteDecision | undefined;
  set(key: string, value: RouteDecision, ttlMs?: number): void;
  clear(): void;
}

class InMemoryRoutingCache implements RoutingCache {
  private cache = new Map<string, { value: RouteDecision; expiresAt: number }>();
  private readonly defaultTtlMs: number;

  constructor(defaultTtlMs = 300_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): RouteDecision | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: RouteDecision, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }

  clear(): void {
    this.cache.clear();
  }
}

let globalCache: RoutingCache | null = null;

export function isRoutingCacheEnabled(): boolean {
  return process.env.MULTI_AGENT_ROUTING_CACHE !== 'false';
}

export function getRoutingCacheTtlMs(): number {
  const raw = process.env.MULTI_AGENT_ROUTING_CACHE_TTL_MS;
  const n = raw ? Number(raw) : 300_000;
  return Number.isFinite(n) && n > 0 ? n : 300_000;
}

export function getOrCreateRoutingCache(): RoutingCache {
  if (!globalCache) {
    globalCache = new InMemoryRoutingCache(getRoutingCacheTtlMs());
  }
  return globalCache;
}

export function clearRoutingCache(): void {
  globalCache?.clear();
}

export function createRoutingCacheKey(intent: string, command: string): string {
  return `route:${intent}:${command.slice(0, 200)}`;
}

export function createPlanCacheKey(intent: string, command: string): string {
  return `plan:${intent}:${command.slice(0, 200)}`;
}
