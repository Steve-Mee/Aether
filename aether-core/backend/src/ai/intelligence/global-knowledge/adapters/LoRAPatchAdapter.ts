import type { GlobalKnowledgePort, GlobalKnowledgeListFilter } from '../GlobalKnowledgePort';
import { GlobalKnowledgePatchRepository } from '../GlobalKnowledgePatchRepository';
import type { KnowledgePatch } from '../types';

export class LoRAPatchAdapter implements GlobalKnowledgePort {
  private readonly catalogVersion = 'lora-1.0.0';

  constructor(private repo = new GlobalKnowledgePatchRepository()) {}

  getCatalogVersion(): string {
    return this.catalogVersion;
  }

  async listPatches(_tenantId: string, _filter?: GlobalKnowledgeListFilter): Promise<KnowledgePatch[]> {
    void _tenantId;
    void _filter;
    if (process.env.INTELLIGENCE_GLOBAL_KNOWLEDGE_V3 !== 'true') return [];

    const rows = await this.repo.listByStatus('active');
    return rows
      .filter((r) => r.kind === 'lora_trait' || r.kind === 'lora_config')
      .map((r) => ({
        id: r.patchKey,
        version: r.version,
        kind: r.kind as KnowledgePatch['kind'],
        category: r.category,
        title: r.title,
        content: r.content,
        priority: r.priority,
        minProfile:
          r.minProfile === 'conservative' || r.minProfile === 'aggressive'
            ? r.minProfile
            : 'balanced',
        tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
        payload:
          r.payload && typeof r.payload === 'object'
            ? (r.payload as Record<string, unknown>)
            : undefined,
      }));
  }
}
