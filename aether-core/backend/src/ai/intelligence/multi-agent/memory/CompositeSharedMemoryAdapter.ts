import type { MemoryScope } from './runMemoryConfig';
import { PrismaMerchantSharedMemoryAdapter } from './PrismaMerchantSharedMemoryAdapter';
import { PrismaRunWorkingMemoryAdapter } from './PrismaRunWorkingMemoryAdapter';
import type {
  RunMemoryEntry,
  RunMemoryWriteInput,
  RunMemoryVersionResult,
  RunWorkingMemoryPort,
} from './RunWorkingMemoryPort';

export class CompositeSharedMemoryAdapter implements RunWorkingMemoryPort {
  private run = new PrismaRunWorkingMemoryAdapter();
  private merchant = new PrismaMerchantSharedMemoryAdapter();

  private resolveScope(scope?: MemoryScope): MemoryScope {
    return scope ?? 'run';
  }

  async get(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope?: MemoryScope
  ): Promise<unknown | null> {
    if (this.resolveScope(scope) === 'merchant') {
      return this.merchant.get(tenantId, namespace, key);
    }
    return this.run.get(tenantId, runId, namespace, key);
  }

  async getWithVersion(
    tenantId: string,
    runId: string,
    namespace: string,
    key: string,
    scope?: MemoryScope
  ): Promise<{ value: unknown; version: number } | null> {
    if (this.resolveScope(scope) === 'merchant') {
      return this.merchant.getWithVersion(tenantId, namespace, key);
    }
    return this.run.getWithVersion(tenantId, runId, namespace, key);
  }

  async set(input: RunMemoryWriteInput): Promise<void> {
    const scope = this.resolveScope(input.scope);
    if (scope === 'merchant') {
      await this.merchant.set(input);
      return;
    }
    await this.run.set(input);
  }

  async merge(input: RunMemoryWriteInput): Promise<void> {
    const scope = this.resolveScope(input.scope);
    if (scope === 'merchant') {
      await this.merchant.merge(input);
      return;
    }
    await this.run.merge(input);
  }

  async appendToArray(input: RunMemoryWriteInput & { maxItems?: number }): Promise<void> {
    const scope = this.resolveScope(input.scope);
    if (scope === 'merchant') {
      await this.merchant.appendToArray(input);
      return;
    }
    await this.run.appendToArray(input);
  }

  async compareAndSet(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult> {
    const scope = this.resolveScope(input.scope);
    if (scope === 'merchant') {
      return this.merchant.compareAndSet(input);
    }
    return this.run.compareAndSet(input);
  }

  async mergeWithVersion(
    input: RunMemoryWriteInput & { expectedVersion?: number }
  ): Promise<RunMemoryVersionResult> {
    const scope = this.resolveScope(input.scope);
    if (scope === 'merchant') {
      return this.merchant.mergeWithVersion(input);
    }
    return this.run.mergeWithVersion(input);
  }

  async list(
    tenantId: string,
    runId: string,
    namespace?: string,
    scope?: MemoryScope
  ): Promise<RunMemoryEntry[]> {
    if (this.resolveScope(scope) === 'merchant') {
      return this.merchant.list(tenantId, namespace);
    }
    return this.run.list(tenantId, runId, namespace);
  }

  async buildPromptBlock(
    tenantId: string,
    runId: string,
    agentKey: string,
    maxChars?: number
  ): Promise<string> {
    return this.run.buildPromptBlock(tenantId, runId, agentKey, maxChars);
  }

  async buildMerchantPromptBlock(
    tenantId: string,
    agentKey: string,
    maxChars?: number
  ): Promise<string> {
    return this.merchant.buildMerchantPromptBlock(tenantId, agentKey, maxChars);
  }

  async buildSharedSnapshot(
    tenantId: string,
    runId: string,
    scope?: MemoryScope
  ): Promise<Record<string, unknown>> {
    if (this.resolveScope(scope) === 'merchant') {
      return this.merchant.buildSharedSnapshot(tenantId);
    }
    return this.run.buildSharedSnapshot(tenantId, runId);
  }

  async purgeExpired(scope?: MemoryScope, batchSize = 500): Promise<number> {
    if (scope === 'run') return this.run.purgeExpired(batchSize);
    if (scope === 'merchant') return this.merchant.purgeExpired(batchSize);
    const run = await this.run.purgeExpired(batchSize);
    const merchant = await this.merchant.purgeExpired(batchSize);
    return run + merchant;
  }
}
