import type { KnowledgePatch } from './types';

export interface GlobalKnowledgeListFilter {
  categories?: string[];
}

export interface GlobalKnowledgePort {
  listPatches(tenantId: string, filter?: GlobalKnowledgeListFilter): Promise<KnowledgePatch[]>;
  getCatalogVersion(): string;
}
