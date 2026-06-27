import type { AdminDataPort } from '../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { PersonalBrainRegistry } from '../personal-brain/PersonalBrainRegistry';
import { formatProductSnippet } from './formatProductSnippet';

const INDEX_TTL_MS = 5 * 60 * 1000;

/**
 * Lazy-syncs merchant catalog data into the PersonalBrain vector store.
 * Products are indexed as stable documents (id: product:{id}) for RAG retrieval.
 */
export class MerchantKnowledgeIndexer {
  private indexedAt = new Map<string, number>();

  constructor(
    private personalBrains: PersonalBrainRegistry,
    private adminData: AdminDataPort
  ) {}

  async ensureIndexed(tenantId: string, agentKey = 'admin'): Promise<void> {
    const cacheKey = `${tenantId}:${agentKey}`;
    const lastIndexed = this.indexedAt.get(cacheKey);
    if (lastIndexed && Date.now() - lastIndexed < INDEX_TTL_MS) {
      return;
    }

    await this.indexProducts(tenantId, agentKey);
    this.indexedAt.set(cacheKey, Date.now());
  }

  /** Force re-index (e.g. after product mutations). */
  async indexProducts(tenantId: string, agentKey = 'admin'): Promise<number> {
    const brain = this.personalBrains.get(tenantId, agentKey);
    const products = await this.adminData.listProductsForBrain(tenantId);

    for (const product of products) {
      const content = formatProductSnippet(product);
      await brain.indexKnowledge({
        id: `product:${product.id}`,
        content,
        metadata: { type: 'product', productId: product.id, name: product.name },
      });
    }

    return products.length;
  }

  /** Clear in-memory cache so next command re-indexes. */
  invalidate(tenantId: string, agentKey = 'admin'): void {
    this.indexedAt.delete(`${tenantId}:${agentKey}`);
  }
}
