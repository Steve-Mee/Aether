import catalog from './catalog/default-patches.json';
import type { GlobalKnowledgePort, GlobalKnowledgeListFilter } from './GlobalKnowledgePort';
import type { KnowledgePatch } from './types';

interface CatalogFile {
  version: string;
  patches: KnowledgePatch[];
}

export class StaticGlobalKnowledgeCatalog implements GlobalKnowledgePort {
  private readonly catalog: CatalogFile;

  constructor(source: CatalogFile = catalog as CatalogFile) {
    this.catalog = source;
  }

  getCatalogVersion(): string {
    return this.catalog.version;
  }

  async listPatches(_tenantId: string, filter?: GlobalKnowledgeListFilter): Promise<KnowledgePatch[]> {
    void _tenantId;
    let patches = [...this.catalog.patches];
    if (filter?.categories?.length) {
      const allowed = new Set(filter.categories);
      patches = patches.filter((p) => allowed.has(p.category));
    }
    return patches;
  }
}
