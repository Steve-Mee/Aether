import { EmailClassifierService } from '../modules/aether-mail/application/services/EmailClassifierService';

describe('EmailClassifierService', () => {
  it('classifies high-risk keywords via heuristic fallback', async () => {
    const classifier = new EmailClassifierService();
    const result = await classifier.classify({
      from: 'customer@example.com',
      subject: 'Refund request',
      body: 'I want a refund immediately, this is terrible',
    });
    expect(result.riskLevel).toBe('high');
    expect(result.confidence).toBeGreaterThan(0);
  });
});
