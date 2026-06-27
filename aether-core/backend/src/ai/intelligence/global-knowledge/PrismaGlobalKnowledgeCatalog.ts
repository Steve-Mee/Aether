import type { GlobalKnowledgePort, GlobalKnowledgeListFilter } from './GlobalKnowledgePort';
import type { KnowledgePatch } from './types';
import { GlobalKnowledgePatchRepository } from './GlobalKnowledgePatchRepository';

export class PrismaGlobalKnowledgeCatalog implements GlobalKnowledgePort {
  constructor(private repo = new GlobalKnowledgePatchRepository()) {}

  getCatalogVersion(): string {
    // sync version resolved async in composite; placeholder for port contract
    return 'db-pending';
  }

  async resolveCatalogVersion(): Promise<string> {
    return this.repo.getCatalogVersion();
  }

  async listPatches(_tenantId: string, _filter?: GlobalKnowledgeListFilter): Promise<KnowledgePatch[]> {
    void _tenantId;
    void _filter;
    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V2 !== 'true') {
      return [];
    }
    return this.repo.listActive();
  }
}
