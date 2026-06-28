import { ExplainabilitySimilarityService } from '../ExplainabilitySimilarityService';

const listForSimilarityMock = jest.fn();
const listGlobalPatternsMock = jest.fn();

jest.mock('../ExplainabilityPersister', () => ({
  explainabilityPersister: {
    listForSimilarity: (...args: unknown[]) => listForSimilarityMock(...args),
  },
}));

jest.mock('../global/ExplainabilityPatternContributionService', () => ({
  explainabilityPatternContributionService: {
    listGlobalPatterns: (...args: unknown[]) => listGlobalPatternsMock(...args),
  },
}));

describe('ExplainabilitySimilarityService', () => {
  const service = new ExplainabilitySimilarityService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns top matches scored by agent overlap', async () => {
    listForSimilarityMock.mockResolvedValue([
      {
        sourceType: 'command',
        sourceId: 'cmd_old',
        summary: 'Eerdere actie',
        agentKeys: ['inventory', 'pricing'],
        triggerId: 'low_stock',
        intentId: null,
        createdAt: new Date(),
      },
      {
        sourceType: 'command',
        sourceId: 'cmd_other',
        summary: 'Andere actie',
        agentKeys: ['supplier'],
        triggerId: 'other',
        intentId: null,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
    ]);

    const results = await service.findSimilar({
      tenantId: 't1',
      sourceType: 'command',
      sourceId: 'cmd_new',
      agentKeys: ['inventory', 'pricing'],
      triggerId: 'low_stock',
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.sourceId).toBe('cmd_old');
  });

  it('merges global patterns without foreign sourceId when includeGlobal', async () => {
    listForSimilarityMock.mockResolvedValue([]);
    listGlobalPatternsMock.mockResolvedValue([
      {
        row: {
          patternKey: 'pk1',
          sourceType: 'command',
          summaryTemplate: 'Generiek patroon',
          tenantCount: 5,
          agentKeys: ['inventory', 'pricing'],
          triggerId: 'low_stock',
        },
        score: 2.5,
      },
    ]);

    const results = await service.findSimilar({
      tenantId: 't1',
      sourceType: 'command',
      sourceId: 'cmd_new',
      agentKeys: ['inventory', 'pricing'],
      triggerId: 'low_stock',
      includeGlobal: true,
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.scope).toBe('global');
    expect(results[0]?.sourceId).toBeUndefined();
    expect(results[0]?.peerTenantCount).toBe(5);
  });
});
