import type { MemoryScope } from './runMemoryConfig';
import { isRunMemoryEnabled, runMemoryCacheTtlMs } from './runMemoryConfig';
import type {
  RunMemoryEntry,
  RunMemoryVersionResult,
  RunMemoryWriteInput,
  RunWorkingMemoryPort,
} from './RunWorkingMemoryPort';

interface CacheEntry {
  value: unknown;
  version: number;
  expiresAt: number;
}

export class CachingRunWorkingMemoryAdapter implements RunWorkingMemoryPort {
  private cache = new Map<string, CacheEntry>();

  constructor(
    private inner: RunWorkingMemoryPort,
    private ttlMs = runMemoryCacheTtlMs()
  ) {}

  private cacheKey(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope: MemoryScope
  ): string {
    const scopePart = scope === 'merchant' ? `m:${tenantId}` : `r:${tenantId}:${runId}`;
    return `${scopePart}:${namespace}:${key}`;
  }

  private getCached(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry;
  }

  private setCached(key: string, value: unknown, version: number): void {
    if (this.ttlMs <= 0) return;
    this.cache.set(key, { value, version, expiresAt: Date.now() + this.ttlMs });
    if (this.cache.size > 500) {
      const first = this.cache.keys().next().value;
      if (first) this.cache.delete(first);
    }
  }

  private invalidateScope(tenantId: string, runId: string, scope: MemoryScope): void {
    const prefix = scope === 'merchant' ? `m:${tenantId}:` : `r:${tenantId}:${runId}:`;
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) this.cache.delete(k);
    }
  }

  async get(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope: MemoryScope = 'run'
  ): Promise<unknown | null> {
    const ck = this.cacheKey(tenantId, runId, namespace, key, scope);
    const cached = this.getCached(ck);
    if (cached) return cached.value;
    const value = await this.inner.get(tenantId, runId, namespace, key, scope);
    if (value !== null) {
      const withVersion = await this.inner.getWithVersion(tenantId, runId, namespace, key, scope);
      if (withVersion) this.setCached(ck, withVersion.value, withVersion.version);
    }
    return value;
  }

  async getWithVersion(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope: MemoryScope = 'run'
  ): Promise<{ value: unknown; version: number } | null> {
    const ck = this.cacheKey(tenantId, runId, namespace, key, scope);
    const cached = this.getCached(ck);
    if (cached) return { value: cached.value, version: cached.version };
    const row = await this.inner.getWithVersion(tenantId, runId, namespace, key, scope);
    if (row) this.setCached(ck, row.value, row.version);
    return row;
  }

  async set(input: RunMemoryWriteInput): Promise<void> {
    if (!isRunMemoryEnabled()) return;
    await this.inner.set(input);
    this.invalidateScope(input.tenantId, input.runId, input.scope ?? 'run');
  }

  async merge(input: RunMemoryWriteInput): Promise<void> {
    if (!isRunMemoryEnabled()) return;
    await this.inner.merge(input);
    this.invalidateScope(input.tenantId, input.runId, input.scope ?? 'run');
  }

  async appendToArray(input: RunMemoryWriteInput & { maxItems?: number }): Promise<void> {
    if (!isRunMemoryEnabled()) return;
    await this.inner.appendToArray(input);
    this.invalidateScope(input.tenantId, input.runId, input.scope ?? 'run');
  }

  async compareAndSet(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult> {
    const result = await this.inner.compareAndSet(input);
    this.invalidateScope(input.tenantId, input.runId, input.scope ?? 'run');
    return result;
  }

  async mergeWithVersion(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult> {
    const result = await this.inner.mergeWithVersion(input);
    this.invalidateScope(input.tenantId, input.runId, input.scope ?? 'run');
    return result;
  }

  async list(
    tenantId: string,
    runId: string,
    namespace?: string,
    scope?: MemoryScope
  ): Promise<RunMemoryEntry[]> {
    return this.inner.list(tenantId, runId, namespace, scope);
  }

  async buildPromptBlock(
    tenantId: string,
    runId: string,
    agentKey: string,
    maxChars?: number
  ): Promise<string> {
    return this.inner.buildPromptBlock(tenantId, runId, agentKey, maxChars);
  }

  async buildMerchantPromptBlock(
    tenantId: string,
    agentKey: string,
    maxChars?: number
  ): Promise<string> {
    return this.inner.buildMerchantPromptBlock(tenantId, agentKey, maxChars);
  }

  async buildSharedSnapshot(
    tenantId: string,
    runId: string,
    scope?: MemoryScope
  ): Promise<Record<string, unknown>> {
    return this.inner.buildSharedSnapshot(tenantId, runId, scope);
  }

  async purgeExpired(scope?: MemoryScope, batchSize?: number): Promise<number> {
    return this.inner.purgeExpired(scope, batchSize);
  }
}
