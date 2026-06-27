import { HiveMindKnowledgeTransferAdapter } from '../HiveMindKnowledgeTransferAdapter';

describe('HiveMindKnowledgeTransferAdapter', () => {
  const originalEnv = process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED;

  afterEach(() => {
    process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = originalEnv;
  });

  it('submits insights via SubmitInsightUseCase when enabled', async () => {
    process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = 'true';
    const submitInsight = { execute: jest.fn().mockResolvedValue({ id: 'ins_1' }) };
    const queryInsights = { execute: jest.fn().mockResolvedValue({ message: 'not enough' }) };
    const adapter = new HiveMindKnowledgeTransferAdapter(
      submitInsight as any,
      queryInsights as any
    );

    const result = await adapter.submitAnonymizedInsights('tenant_a', [
      { category: 'pricing', metric: 'auto_apply_rate', value: 1, sampleSize: 1 },
    ]);

    expect(submitInsight.execute).toHaveBeenCalled();
    expect(result.count).toBe(1);
  });

  it('maps query results to knowledge updates when enough samples', async () => {
    process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = 'true';
    const submitInsight = { execute: jest.fn() };
    const queryInsights = {
      execute: jest.fn().mockResolvedValue({
        average: 0.12,
        sampleSize: 6,
        min: 0.1,
        max: 0.15,
        confidence: 0.8,
      }),
    };
    const adapter = new HiveMindKnowledgeTransferAdapter(
      submitInsight as any,
      queryInsights as any
    );

    const result = await adapter.getKnowledgeUpdates('tenant_a');
    expect(result.updates.length).toBeGreaterThan(0);
    expect(result.version).toBe('1.0.0');
  });
});
