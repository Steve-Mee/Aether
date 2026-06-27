import { InMemoryVectorStoreAdapter } from '../adapters/InMemoryVectorStoreAdapter';
import { JsonFileVectorStoreAdapter } from '../adapters/JsonFileVectorStoreAdapter';
import { SimpleHashEmbeddingAdapter } from '../SimpleHashEmbeddingAdapter';
import { ResilientEmbeddingAdapter } from '../ResilientEmbeddingAdapter';

describe('InMemoryVectorStoreAdapter', () => {
  const embedding = new SimpleHashEmbeddingAdapter();
  let store: InMemoryVectorStoreAdapter;

  beforeEach(() => {
    store = new InMemoryVectorStoreAdapter();
  });

  it('isolates search results by tenantId', async () => {
    const vec = await embedding.embed('supplier monitor acme');
    await store.upsert('tenant_a', {
      id: 'mem_a',
      content: 'tenant a memory',
      embedding: vec,
    });
    await store.upsert('tenant_b', {
      id: 'mem_b',
      content: 'tenant b memory',
      embedding: vec,
    });

    const resultsA = await store.search('tenant_a', { embedding: vec, limit: 10 });
    const resultsB = await store.search('tenant_b', { embedding: vec, limit: 10 });

    expect(resultsA).toHaveLength(1);
    expect(resultsA[0].content).toBe('tenant a memory');
    expect(resultsB).toHaveLength(1);
    expect(resultsB[0].content).toBe('tenant b memory');
  });

  it('deletes only within tenant scope key', async () => {
    const vec = await embedding.embed('delete test');
    await store.upsert('tenant_a', { id: 'x1', content: 'a', embedding: vec });
    await store.delete('tenant_a', 'x1');
    const results = await store.search('tenant_a', { embedding: vec, limit: 5 });
    expect(results).toHaveLength(0);
  });
});

describe('SimpleHashEmbeddingAdapter', () => {
  it('returns deterministic vectors of configured dimension', async () => {
    const adapter = new SimpleHashEmbeddingAdapter();
    const a = await adapter.embed('hello');
    const b = await adapter.embed('hello');
    const c = await adapter.embed('world');
    expect(a).toHaveLength(384);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
  });
});

describe('JsonFileVectorStoreAdapter', () => {
  it('isolates tenants like in-memory store', async () => {
    const os = await import('os');
    const path = await import('path');
    const store = new JsonFileVectorStoreAdapter(
      path.join(os.tmpdir(), `aether-lance-test-${Date.now()}`)
    );
    store.clear();
    const embedding = new SimpleHashEmbeddingAdapter();
    const vec = await embedding.embed('lance test');
    await store.upsert('tenant_x', { id: 'm1', content: 'x only', embedding: vec });
    await store.upsert('tenant_y', { id: 'm2', content: 'y only', embedding: vec });
    const xResults = await store.search('tenant_x', { embedding: vec, limit: 5 });
    expect(xResults).toHaveLength(1);
    expect(xResults[0].content).toBe('x only');
  });
});

describe('ResilientEmbeddingAdapter', () => {
  it('falls back to hash when primary fails', async () => {
    const primary = { dimensions: 384, embed: jest.fn().mockRejectedValue(new Error('down')) };
    const fallback = new SimpleHashEmbeddingAdapter();
    const adapter = new ResilientEmbeddingAdapter(primary as any, fallback);
    const vec = await adapter.embed('fallback test');
    expect(vec).toHaveLength(384);
    expect(primary.embed).toHaveBeenCalled();
  });
});
