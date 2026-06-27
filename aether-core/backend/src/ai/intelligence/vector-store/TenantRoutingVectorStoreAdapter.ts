import { prisma } from '../../../shared/prisma/client';
import type { VectorStorePort } from './VectorStorePort';
import type { VectorDocument, VectorMatch, VectorQuery } from './types';
import { InMemoryVectorStoreAdapter } from './adapters/InMemoryVectorStoreAdapter';
import { JsonFileVectorStoreAdapter } from './adapters/JsonFileVectorStoreAdapter';
import { PrismaPgVectorAdapter } from './adapters/PrismaPgVectorAdapter';

export type BrainVectorBackend = 'pgvector' | 'lancedb' | 'memory';

function createStoreForBackend(backend: BrainVectorBackend, lancePath?: string | null): VectorStorePort {
  if (backend === 'memory') return new InMemoryVectorStoreAdapter();
  if (backend === 'lancedb') {
    return new JsonFileVectorStoreAdapter(lancePath ?? process.env.LANCE_DB_PATH ?? './data/brain-lance');
  }
  return new PrismaPgVectorAdapter();
}

function resolveBackendFromEnv(): BrainVectorBackend {
  const env = process.env.INTELLIGENCE_VECTOR_BACKEND ?? 'pgvector';
  if (env === 'memory' || env === 'lancedb') return env;
  return 'pgvector';
}

/**
 * Routes vector operations per tenant using TenantSettings.brainVectorBackend, falling back to env.
 */
export class TenantRoutingVectorStoreAdapter implements VectorStorePort {
  private storeCache = new Map<string, VectorStorePort>();
  private tenantBackendCache = new Map<string, BrainVectorBackend>();

  private storeForBackend(backend: BrainVectorBackend, lancePath?: string | null): VectorStorePort {
    const cacheKey = `${backend}:${lancePath ?? ''}`;
    let store = this.storeCache.get(cacheKey);
    if (!store) {
      store = createStoreForBackend(backend, lancePath);
      this.storeCache.set(cacheKey, store);
    }
    return store;
  }

  async resolveStoreForTenant(tenantId: string): Promise<VectorStorePort> {
    const cached = this.tenantBackendCache.get(tenantId);
    if (cached) {
      return this.storeForBackend(cached);
    }

    const row = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { brainVectorBackend: true, brainLoRAPath: true },
    });

    const backend = (row?.brainVectorBackend as BrainVectorBackend | null) ?? resolveBackendFromEnv();
    const resolved: BrainVectorBackend =
      backend === 'memory' || backend === 'lancedb' || backend === 'pgvector'
        ? backend
        : resolveBackendFromEnv();

    this.tenantBackendCache.set(tenantId, resolved);
    return this.storeForBackend(resolved, row?.brainLoRAPath);
  }

  /** Test helper */
  clearTenantCache(): void {
    this.tenantBackendCache.clear();
  }

  async upsert(tenantId: string, doc: VectorDocument): Promise<void> {
    const store = await this.resolveStoreForTenant(tenantId);
    return store.upsert(tenantId, doc);
  }

  async search(tenantId: string, query: VectorQuery): Promise<VectorMatch[]> {
    const store = await this.resolveStoreForTenant(tenantId);
    return store.search(tenantId, query);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const store = await this.resolveStoreForTenant(tenantId);
    return store.delete(tenantId, id);
  }
}

export function resolveVectorStore(): VectorStorePort {
  if (process.env.INTELLIGENCE_VECTOR_BACKEND === 'memory') {
    return new InMemoryVectorStoreAdapter();
  }
  return new TenantRoutingVectorStoreAdapter();
}
