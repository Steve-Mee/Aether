import { buildApprovalRationale } from '../BrainApprovalRationaleBuilder';

describe('BrainApprovalRationaleBuilder', () => {
  it('combines base rationale and learned hint', async () => {
    const result = await buildApprovalRationale({
      tenantId: 't1',
      tool: 'updatePrice',
      baseRationale: 'Prijs stijgt 8%',
      learnedHint: 'Je keurt vergelijkbare acties meestal goed',
    });
    expect(result.rationale).toContain('Prijs stijgt 8%');
    expect(result.rationale).toContain('Je keurt vergelijkbare acties meestal goed');
    expect(result.learnedHint).toBe('Je keurt vergelijkbare acties meestal goed');
  });

  it('adds collective insight when KT enabled', async () => {
    const result = await buildApprovalRationale({
      tenantId: 't1',
      tool: 'updatePrice',
      baseRationale: 'Test',
      ktGate: { isEnabled: async () => true },
      globalBrain: {
        getCollectiveInsights: async () => [
          { category: 'pricing', summary: 'avg rate 0.72 (n=40)', sampleSize: 40 },
        ],
      },
    });
    expect(result.ktSnippets).toEqual(['avg rate 0.72 (n=40)']);
    expect(result.rationale).toContain('Collectief inzicht');
  });

  it('skips KT when gate disabled', async () => {
    const result = await buildApprovalRationale({
      tenantId: 't1',
      tool: 'updatePrice',
      baseRationale: 'Only base',
      ktGate: { isEnabled: async () => false },
      globalBrain: {
        getCollectiveInsights: async () => [
          { category: 'pricing', summary: 'hidden', sampleSize: 10 },
        ],
      },
    });
    expect(result.ktSnippets).toBeUndefined();
    expect(result.rationale).toBe('Only base');
  });
});
