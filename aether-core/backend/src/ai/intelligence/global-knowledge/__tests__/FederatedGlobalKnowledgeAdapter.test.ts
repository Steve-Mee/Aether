import { FederatedGlobalKnowledgeAdapter } from '../federated/FederatedGlobalKnowledgeAdapter';
import type { FederatedQueryUseCase } from '../federated/FederatedQueryUseCase';

describe('FederatedGlobalKnowledgeAdapter', () => {
  it('lists metric insight patches from federated query', async () => {
    const query: Pick<FederatedQueryUseCase, 'listFederatedPatches'> = {
      listFederatedPatches: async () => [
        {
          id: 'federated:pricing:conversion_rate',
          version: 'federated-1.0.0',
          kind: 'metric_insight',
          category: 'pricing',
          title: 'Federated conversion rate',
          content: 'avg conversion_rate=0.75 (n=50, tenants=8)',
          priority: 8,
          minProfile: 'conservative',
        },
      ],
    };

    const adapter = new FederatedGlobalKnowledgeAdapter(query as FederatedQueryUseCase);
    const patches = await adapter.listPatches('tenant_a');

    expect(patches).toHaveLength(1);
    expect(patches[0]?.id).toBe('federated:pricing:conversion_rate');
    expect(adapter.getCatalogVersion()).toBe('federated-1.0.0');
  });
});
