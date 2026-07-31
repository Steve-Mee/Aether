import { KnowledgeTransferService } from '../KnowledgeTransferService';

describe('KnowledgeTransferService', () => {
  const originalEnv = process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED;

  afterEach(() => {
    process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = originalEnv;
  });

  it('returns empty updates when disabled', async () => {
    process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = 'false';
    const service = new KnowledgeTransferService();
    const result = await service.getKnowledgeUpdates('merchant_1');
    expect(result).toEqual({ updates: [], version: '0.0.0' });
  });

  it('does not claim acceptance when disabled (no hive bridge)', async () => {
    process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = 'false';
    const service = new KnowledgeTransferService();
    const result = await service.submitAnonymizedInsights('merchant_1', [
      { category: 'pricing', metric: 'uplift', value: 0.05 },
    ]);
    expect(result).toEqual({ accepted: false, count: 0 });
  });

  it('does not claim acceptance when enabled but no hive bridge', async () => {
    process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED = 'true';
    const service = new KnowledgeTransferService();
    const result = await service.submitAnonymizedInsights('merchant_1', [
      { category: 'pricing', metric: 'uplift', value: 0.05 },
    ]);
    expect(result).toEqual({ accepted: false, count: 0 });
  });
});
