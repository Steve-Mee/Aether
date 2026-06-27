import { buildCollectiveContext } from '../CollectiveContextBuilder';
import type { GlobalBrainPort } from '../../global-brain/GlobalBrainPort';
import type { KnowledgeTransferPort } from '../../knowledge-transfer/KnowledgeTransferPort';

describe('CollectiveContextBuilder', () => {
  it('returns empty when KT disabled', async () => {
    const result = await buildCollectiveContext({
      tenantId: 'tenant_1',
      ktGate: { isEnabled: async () => false },
    });
    expect(result.allSnippets).toHaveLength(0);
  });

  it('merges merchant collective, knowledge updates, and global patches', async () => {
    const globalBrain: GlobalBrainPort = {
      getCollectiveInsights: async () => [
        { category: 'pricing', summary: 'avg conversion=0.7', sampleSize: 10 },
      ],
    };
    const knowledgeTransfer: KnowledgeTransferPort = {
      getKnowledgeUpdates: async () => ({
        updates: [{ id: 'u1', category: 'pricing', summary: 'update snippet' }],
        version: '1.0.0',
      }),
      submitAnonymizedInsights: async () => ({ accepted: true, count: 0 }),
    };

    const result = await buildCollectiveContext({
      tenantId: 'tenant_1',
      globalBrain,
      knowledgeTransfer,
      globalKnowledgeService: {
        getActiveContextSnippets: async () => ['[global:pattern] Test: content'],
      } as never,
      ktGate: { isEnabled: async () => true },
    });

    expect(result.merchantCollective[0]).toContain('[collective:pricing]');
    expect(result.knowledgeUpdateSnippets).toContain('update snippet');
    expect(result.globalKnowledgeSnippets[0]).toContain('[global:pattern]');
    expect(result.allSnippets).toHaveLength(3);
  });
});
