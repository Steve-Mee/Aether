import { EmailClassifierService } from '../modules/aether-mail/application/services/EmailClassifierService';

describe('EmailClassifierService', () => {
  it('classifies high-risk keywords via heuristic fallback', async () => {
    // Force heuristic path — default Ollama can hang past Jest's 5s when a model is slow/unavailable.
    const classifier = new EmailClassifierService({
      model: 'test-stub',
      generate: async () => {
        throw new Error('ollama unavailable in unit test');
      },
    });
    const result = await classifier.classify({
      from: 'customer@example.com',
      subject: 'Refund request',
      body: 'I want a refund immediately, this is terrible',
    });
    expect(result.riskLevel).toBe('high');
    expect(result.source).toBe('heuristic');
    expect(result.confidence).toBeGreaterThan(0);
  });
});
