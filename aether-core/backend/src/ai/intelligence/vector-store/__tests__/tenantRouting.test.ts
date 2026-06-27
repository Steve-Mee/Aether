jest.mock('../../../../shared/prisma/client', () => ({
  prisma: {
    tenantSettings: { findUnique: jest.fn() },
  },
}));

import { prisma } from '../../../../shared/prisma/client';
import { TenantRoutingVectorStoreAdapter } from '../TenantRoutingVectorStoreAdapter';
import { SimpleHashEmbeddingAdapter } from '../SimpleHashEmbeddingAdapter';

describe('TenantRoutingVectorStoreAdapter', () => {
  const originalBackend = process.env.INTELLIGENCE_VECTOR_BACKEND;

  afterEach(() => {
    process.env.INTELLIGENCE_VECTOR_BACKEND = originalBackend;
    jest.clearAllMocks();
  });

  it('uses tenant brainVectorBackend override over env default', async () => {
    process.env.INTELLIGENCE_VECTOR_BACKEND = 'pgvector';
    (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
      brainVectorBackend: 'memory',
      brainLoRAPath: null,
    });

    const router = new TenantRoutingVectorStoreAdapter();
    router.clearTenantCache();
    const embedding = new SimpleHashEmbeddingAdapter();
    const vec = await embedding.embed('tenant memory routing');

    await router.upsert('tenant_route', { id: 'r1', content: 'routed memory', embedding: vec });
    const results = await router.search('tenant_route', { embedding: vec, limit: 5 });

    expect(results).toHaveLength(1);
    expect(results[0].content).toBe('routed memory');
  });
});
