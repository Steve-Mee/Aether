import type { VectorDocument, VectorMatch, VectorQuery } from './types';

export interface VectorStorePort {
  upsert(tenantId: string, doc: VectorDocument): Promise<void>;
  search(tenantId: string, query: VectorQuery): Promise<VectorMatch[]>;
  delete(tenantId: string, id: string): Promise<void>;
}
