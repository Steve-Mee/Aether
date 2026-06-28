import { getRedisClient } from '../../../../shared/redis/createRedisClient';
import {
  isRunMemoryEnabled,
  isRunMemoryRedisCacheEnabled,
  runMemoryRedisTtlSec,
} from './runMemoryConfig';
import type { MemoryScope } from './runMemoryConfig';
import type {
  RunMemoryEntry,
  RunMemoryVersionResult,
  RunMemoryWriteInput,
  RunWorkingMemoryPort,
} from './RunWorkingMemoryPort';

interface CachedPayload {
  value: unknown;
  version: number;
}

export class RedisRunMemoryCacheAdapter implements RunWorkingMemoryPort {
  constructor(private inner: RunWorkingMemoryPort) {}

  private redisKey(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope: MemoryScope
  ): string {
    const scopePart = scope === 'merchant' ? `merchant:${tenantId}` : `run:${tenantId}:${runId}`;
    return `aether:runmem:${scopePart}:${namespace}:${key}`;
  }

  private runPrefix(tenantId: string, runId: string): string {
    return `aether:runmem:run:${tenantId}:${runId}:*`;
  }

  private merchantPrefix(tenantId: string): string {
    return `aether:runmem:merchant:${tenantId}:*`;
  }

  private async invalidatePrefix(pattern: string): Promise<void> {
    if (!isRunMemoryRedisCacheEnabled()) return;
    const client = await getRedisClient();
    if (!client) return;
    try {
      let cursor = 0;
      do {
        const reply = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
        cursor = reply.cursor;
        if (reply.keys.length > 0) {
          await client.del(reply.keys);
        }
      } while (cursor !== 0);
    } catch {
      // Cache invalidation is best-effort
    }
  }

  async get(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope: MemoryScope = 'run'
  ): Promise<unknown | null> {
    if (isRunMemoryRedisCacheEnabled()) {
      const client = await getRedisClient();
      if (client) {
        try {
          const raw = await client.get(this.redisKey(tenantId, runId, namespace, key, scope));
          if (raw) {
            const parsed = JSON.parse(raw) as CachedPayload;
            return parsed.value;
          }
        } catch {
          // fall through
        }
      }
    }
    const value = await this.inner.get(tenantId, runId, namespace, key, scope);
    if (value !== null && isRunMemoryRedisCacheEnabled()) {
      const withVersion = await this.inner.getWithVersion(tenantId, runId, namespace, key, scope);
      if (withVersion) await this.cacheEntry(tenantId, runId, namespace, key, scope, withVersion);
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
    if (isRunMemoryRedisCacheEnabled()) {
      const client = await getRedisClient();
      if (client) {
        try {
          const raw = await client.get(this.redisKey(tenantId, runId, namespace, key, scope));
          if (raw) return JSON.parse(raw) as CachedPayload;
        } catch {
          // fall through
        }
      }
    }
    const row = await this.inner.getWithVersion(tenantId, runId, namespace, key, scope);
    if (row) await this.cacheEntry(tenantId, runId, namespace, key, scope, row);
    return row;
  }

  private async cacheEntry(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope: MemoryScope,
    payload: CachedPayload
  ): Promise<void> {
    const client = await getRedisClient();
    if (!client) return;
    try {
      await client.set(this.redisKey(tenantId, runId, namespace, key, scope), JSON.stringify(payload), {
        EX: runMemoryRedisTtlSec(),
      });
    } catch {
      // best-effort
    }
  }

  private async invalidateWrite(input: RunMemoryWriteInput): Promise<void> {
    const scope = input.scope ?? 'run';
    if (scope === 'merchant') {
      await this.invalidatePrefix(this.merchantPrefix(input.tenantId));
    } else {
      await this.invalidatePrefix(this.runPrefix(input.tenantId, input.runId));
    }
  }

  async set(input: RunMemoryWriteInput): Promise<void> {
    if (!isRunMemoryEnabled()) return;
    await this.inner.set(input);
    await this.invalidateWrite(input);
  }

  async merge(input: RunMemoryWriteInput): Promise<void> {
    if (!isRunMemoryEnabled()) return;
    await this.inner.merge(input);
    await this.invalidateWrite(input);
  }

  async appendToArray(input: RunMemoryWriteInput & { maxItems?: number }): Promise<void> {
    if (!isRunMemoryEnabled()) return;
    await this.inner.appendToArray(input);
    await this.invalidateWrite(input);
  }

  async compareAndSet(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult> {
    const result = await this.inner.compareAndSet(input);
    await this.invalidateWrite(input);
    return result;
  }

  async mergeWithVersion(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult> {
    const result = await this.inner.mergeWithVersion(input);
    await this.invalidateWrite(input);
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
