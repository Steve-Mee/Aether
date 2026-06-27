import type { GlobalKnowledgePort, GlobalKnowledgeListFilter } from '../GlobalKnowledgePort';
import type { KnowledgePatch } from '../types';
import { FederatedQueryUseCase } from './FederatedQueryUseCase';

export class FederatedGlobalKnowledgeAdapter implements GlobalKnowledgePort {
  private readonly catalogVersion = 'federated-1.0.0';

  constructor(private federatedQuery: FederatedQueryUseCase) {}

  getCatalogVersion(): string {
    return this.catalogVersion;
  }

  async listPatches(tenantId: string, _filter?: GlobalKnowledgeListFilter): Promise<KnowledgePatch[]> {
    void _filter;
    return this.federatedQuery.listFederatedPatches(tenantId);
  }
}
