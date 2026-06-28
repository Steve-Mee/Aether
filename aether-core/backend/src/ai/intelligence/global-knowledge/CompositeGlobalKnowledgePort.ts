import type { GlobalKnowledgePort, GlobalKnowledgeListFilter } from './GlobalKnowledgePort';
import type { KnowledgePatch } from './types';

/**
 * Merges multiple GlobalKnowledgePort sources. First source wins on id collision
 * (order: db > static > federated > hive > lora > vector).
 */
export class CompositeGlobalKnowledgePort implements GlobalKnowledgePort {
  constructor(private sources: GlobalKnowledgePort[]) {}

  getCatalogVersion(): string {
    return this.sources.map((s) => s.getCatalogVersion()).join('+') || '0.0.0';
  }

  async listPatches(tenantId: string, filter?: GlobalKnowledgeListFilter): Promise<KnowledgePatch[]> {
    const byId = new Map<string, KnowledgePatch>();

    for (const source of this.sources) {
      const patches = await source.listPatches(tenantId, filter);
      for (const patch of patches) {
        if (!byId.has(patch.id)) {
          byId.set(patch.id, patch);
        }
      }
    }

    return [...byId.values()];
  }
}
