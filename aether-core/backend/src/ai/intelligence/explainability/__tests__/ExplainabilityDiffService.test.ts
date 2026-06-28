import { ExplainabilityDiffService } from '../ExplainabilityDiffService';

const getSnapshotMock = jest.fn();

jest.mock('../ExplainabilityPersister', () => ({
  explainabilityPersister: {
    getSnapshot: (...args: unknown[]) => getSnapshotMock(...args),
  },
}));

describe('ExplainabilityDiffService', () => {
  const service = new ExplainabilityDiffService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('diffs agent sets and data sources between snapshots', async () => {
    getSnapshotMock
      .mockResolvedValueOnce({
        sourceType: 'command',
        sourceId: 'cmd_left',
        summary: 'Oud',
        agentKeys: ['inventory'],
        triggerId: 'low_stock',
        intentId: null,
        flowGraph: null,
        payload: {
          dataSources: [{ label: 'Voorraad' }],
          reasoningSteps: [{ label: 'Check stock' }],
        },
      })
      .mockResolvedValueOnce({
        sourceType: 'command',
        sourceId: 'cmd_right',
        summary: 'Nieuw',
        agentKeys: ['inventory', 'pricing'],
        triggerId: 'low_stock',
        intentId: 'RESTOCK',
        flowGraph: {
          nodes: [
            { id: 'inventory', type: 'agent', label: 'Inventory' },
            { id: 'pricing', type: 'agent', label: 'Pricing' },
          ],
          edges: [{ id: 'e1', source: 'inventory', target: 'pricing' }],
        },
        payload: {
          dataSources: [{ label: 'Voorraad' }, { label: 'Prijslijst' }],
          reasoningSteps: [{ label: 'Check stock' }, { label: 'Adjust price' }],
        },
      });

    const diff = await service.diff({
      tenantId: 't1',
      left: { sourceType: 'command', sourceId: 'cmd_left' },
      right: { sourceType: 'command', sourceId: 'cmd_right' },
    });

    expect(diff.summaryChanged).toBe(true);
    expect(diff.agents.added).toEqual(['pricing']);
    expect(diff.agents.removed).toEqual([]);
    expect(diff.intentIdChanged).toBe(true);
    expect(diff.dataSourcesAdded).toContain('Prijslijst');
    expect(diff.reasoningAdded).toContain('Adjust price');
    expect(diff.flowGraph?.addedNodes.map((n) => n.id)).toContain('pricing');
    expect(diff.narrativeHints.some((h) => h.includes('pricing'))).toBe(true);
  });

  it('throws when snapshot is missing', async () => {
    getSnapshotMock.mockResolvedValueOnce(null).mockResolvedValueOnce(null);

    await expect(
      service.diff({
        tenantId: 't1',
        left: { sourceType: 'command', sourceId: 'missing' },
        right: { sourceType: 'command', sourceId: 'also_missing' },
      })
    ).rejects.toThrow('Explainability snapshot not found');
  });
});
