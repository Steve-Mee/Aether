import { prisma } from '../../../../shared/prisma/client';
import type { Prisma } from '@prisma/client';
import { logger } from '../../../../shared/logging/logger';
import { mergeByStrategy } from './mergeStrategies';
import {
  MERCHANT_MEMORY_PROMPT_MAX_CHARS,
  RUN_MEMORY_MAX_KEYS,
  isMerchantMemoryEnabled,
  memoryExpiresAt,
  readableNamespacesForAgent,
  runMemoryMaxAgeMs,
} from './runMemoryConfig';
import type {
  RunMemoryEntry,
  RunMemoryWriteInput,
  RunMemoryVersionResult,
} from './RunWorkingMemoryPort';

function isExpired(expiresAt: Date | null | undefined): boolean {
  return expiresAt != null && expiresAt.getTime() < Date.now();
}

function entryFromRow(r: {
  namespace: string;
  key: string;
  value: unknown;
  version: number;
  updatedByAgentKey: string;
  updatedAt: Date;
  expiresAt: Date | null;
  promotedFromRunId: string | null;
}): RunMemoryEntry {
  return {
    namespace: r.namespace,
    key: r.key,
    value: r.value,
    version: r.version,
    updatedByAgentKey: r.updatedByAgentKey,
    updatedAt: r.updatedAt.toISOString(),
    expiresAt: r.expiresAt?.toISOString(),
  };
}

export class PrismaMerchantSharedMemoryAdapter {
  async get(tenantId: string, namespace: string, key: string): Promise<unknown | null> {
    const row = await this.getWithVersion(tenantId, namespace, key);
    return row?.value ?? null;
  }

  async getWithVersion(
    tenantId: string,
    namespace: string,
    key: string
  ): Promise<{ value: unknown; version: number } | null> {
    if (!isMerchantMemoryEnabled()) return null;
    const row = await prisma.merchantSharedMemory.findUnique({
      where: { tenantId_namespace_key: { tenantId, namespace, key } },
    });
    if (!row) return null;
    if (isExpired(row.expiresAt)) {
      await prisma.merchantSharedMemory.delete({ where: { id: row.id } }).catch(() => undefined);
      return null;
    }
    return { value: row.value, version: row.version };
  }

  async set(input: RunMemoryWriteInput): Promise<void> {
    if (!isMerchantMemoryEnabled()) return;
    const expiresAt = memoryExpiresAt('merchant', input.namespace, input.key);
    await prisma.merchantSharedMemory.upsert({
      where: {
        tenantId_namespace_key: {
          tenantId: input.tenantId,
          namespace: input.namespace,
          key: input.key,
        },
      },
      create: {
        tenantId: input.tenantId,
        namespace: input.namespace,
        key: input.key,
        value: input.value as Prisma.InputJsonValue,
        version: 1,
        updatedByAgentKey: input.updatedByAgentKey,
        promotedFromRunId: input.promotedFromRunId ?? null,
        expiresAt,
      },
      update: {
        value: input.value as Prisma.InputJsonValue,
        updatedByAgentKey: input.updatedByAgentKey,
        version: { increment: 1 },
        expiresAt,
        ...(input.promotedFromRunId ? { promotedFromRunId: input.promotedFromRunId } : {}),
      },
    });
  }

  async compareAndSet(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult> {
    if (!isMerchantMemoryEnabled()) return { ok: true, version: 0 };

    const compositeKey = {
      tenantId: input.tenantId,
      namespace: input.namespace,
      key: input.key,
    };

    const existing = await prisma.merchantSharedMemory.findUnique({
      where: { tenantId_namespace_key: compositeKey },
    });

    const expiresAt = memoryExpiresAt('merchant', input.namespace, input.key);

    if (existing) {
      if (isExpired(existing.expiresAt)) {
        await prisma.merchantSharedMemory.delete({ where: { id: existing.id } });
        await prisma.merchantSharedMemory.create({
          data: {
            ...compositeKey,
            value: input.value as Prisma.InputJsonValue,
            version: 1,
            updatedByAgentKey: input.updatedByAgentKey,
            promotedFromRunId: input.promotedFromRunId ?? null,
            expiresAt,
          },
        });
        return { ok: true, version: 1 };
      }

      const expected = input.expectedVersion ?? existing.version;
      if (existing.version !== expected) {
        return { ok: false, version: existing.version, conflict: existing.value };
      }
      const updated = await prisma.merchantSharedMemory.updateMany({
        where: { ...compositeKey, version: expected },
        data: {
          value: input.value as Prisma.InputJsonValue,
          updatedByAgentKey: input.updatedByAgentKey,
          version: { increment: 1 },
          expiresAt,
        },
      });
      if (updated.count === 0) {
        const current = await prisma.merchantSharedMemory.findUnique({
          where: { tenantId_namespace_key: compositeKey },
        });
        return {
          ok: false,
          version: current?.version ?? expected,
          conflict: current?.value,
        };
      }
      return { ok: true, version: expected + 1 };
    }

    await prisma.merchantSharedMemory.create({
      data: {
        ...compositeKey,
        value: input.value as Prisma.InputJsonValue,
        version: 1,
        updatedByAgentKey: input.updatedByAgentKey,
        promotedFromRunId: input.promotedFromRunId ?? null,
        expiresAt,
      },
    });
    return { ok: true, version: 1 };
  }

  async merge(input: RunMemoryWriteInput): Promise<void> {
    const existing = await this.get(input.tenantId, input.namespace, input.key);
    const merged = mergeByStrategy(input.namespace, input.key, existing, input.value);
    await this.set({ ...input, value: merged });
  }

  async mergeWithVersion(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult> {
    const existing = await this.getWithVersion(input.tenantId, input.namespace, input.key);
    const merged = mergeByStrategy(
      input.namespace,
      input.key,
      existing?.value ?? null,
      input.value
    );
    const result = await this.compareAndSet({
      ...input,
      value: merged,
      expectedVersion: input.expectedVersion ?? existing?.version,
    });
    if (!result.ok && existing) {
      const strategyMerged = mergeByStrategy(
        input.namespace,
        input.key,
        existing.value,
        input.value
      );
      const retry = await this.compareAndSet({
        ...input,
        value: strategyMerged,
        expectedVersion: result.version,
      });
      if (retry.ok) {
        logger.info('shared_memory_merge_conflict_resolved', {
          scope: 'merchant',
          namespace: input.namespace,
          key: input.key,
        });
        return { ...retry, strategyResolved: true };
      }
      return retry;
    }
    return result;
  }

  async appendToArray(input: RunMemoryWriteInput & { maxItems?: number }): Promise<void> {
    const existing = await this.get(input.tenantId, input.namespace, input.key);
    const arr = Array.isArray(existing) ? [...existing] : [];
    arr.push(input.value);
    const max = input.maxItems ?? 20;
    await this.set({ ...input, value: arr.slice(-max) });
  }

  async list(tenantId: string, namespace?: string): Promise<RunMemoryEntry[]> {
    if (!isMerchantMemoryEnabled()) return [];
    const now = new Date();
    const rows = await prisma.merchantSharedMemory.findMany({
      where: {
        tenantId,
        ...(namespace ? { namespace } : {}),
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { updatedAt: 'asc' },
      take: RUN_MEMORY_MAX_KEYS,
    });
    return rows.map(entryFromRow);
  }

  async buildMerchantPromptBlock(
    tenantId: string,
    agentKey: string,
    maxChars = MERCHANT_MEMORY_PROMPT_MAX_CHARS
  ): Promise<string> {
    if (!isMerchantMemoryEnabled()) return '';
    const readable = new Set(readableNamespacesForAgent(agentKey));
    const entries = await this.list(tenantId);
    const visible = entries.filter((e) => readable.has(e.namespace));
    if (visible.length === 0) return '';

    const lines = visible.map(
      (e) => `[merchant/${e.namespace}/${e.key}] ${JSON.stringify(e.value).slice(0, 250)}`
    );
    const block = `Merchant shared memory:\n${lines.join('\n')}`;
    return block.length > maxChars ? `${block.slice(0, maxChars)}…` : block;
  }

  async buildSharedSnapshot(tenantId: string): Promise<Record<string, unknown>> {
    if (!isMerchantMemoryEnabled()) return {};
    const entries = await this.list(tenantId, 'shared');
    const snapshot: Record<string, unknown> = {};
    for (const e of entries) {
      snapshot[e.key] = e.value;
    }
    return snapshot;
  }

  async purgeExpired(batchSize = 500): Promise<number> {
    const now = new Date();
    const maxAgeCutoff = new Date(Date.now() - runMemoryMaxAgeMs());
    const stale = await prisma.merchantSharedMemory.findMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { expiresAt: null, updatedAt: { lt: maxAgeCutoff } }],
      },
      select: { id: true },
      take: batchSize,
    });
    if (stale.length === 0) return 0;
    const deleted = await prisma.merchantSharedMemory.deleteMany({
      where: { id: { in: stale.map((r) => r.id) } },
    });
    return deleted.count;
  }
}
