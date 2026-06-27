import { matchesMetadataFilter } from '../metadataFilter';
import type { VectorStorePort } from '../VectorStorePort';
import type { VectorDocument, VectorMatch, VectorQuery } from '../types';

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

type StoredDoc = VectorDocument & { tenantId: string };

export class InMemoryVectorStoreAdapter implements VectorStorePort {
  private store = new Map<string, StoredDoc>();

  async upsert(tenantId: string, doc: VectorDocument): Promise<void> {
    this.store.set(`${tenantId}:${doc.id}`, { ...doc, tenantId });
  }

  async search(tenantId: string, query: VectorQuery): Promise<VectorMatch[]> {
    const limit = query.limit ?? 5;
    const minScore = query.minScore ?? 0;
    const matches: VectorMatch[] = [];

    for (const doc of this.store.values()) {
      if (doc.tenantId !== tenantId || !doc.embedding) continue;
      if (!matchesMetadataFilter(doc.metadata, query.metadataFilter)) continue;
      const score = cosineSimilarity(query.embedding, doc.embedding);
      if (score >= minScore) {
        matches.push({
          id: doc.id,
          content: doc.content,
          score,
          metadata: doc.metadata,
        });
      }
    }

    return matches.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.store.delete(`${tenantId}:${id}`);
  }

  /** Test helper */
  clear(): void {
    this.store.clear();
  }
}
