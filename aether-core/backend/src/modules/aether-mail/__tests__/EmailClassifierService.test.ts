import { EmailClassifierService } from '../application/services/EmailClassifierService';
import type { LlmInferencePort } from '../../../shared/ai/LlmInferencePort';

describe('EmailClassifierService', () => {
  it('uses LlmInferencePort for classification', async () => {
    const mockLlm: LlmInferencePort = {
      model: 'test-model',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          category: 'order_status',
          confidence: 0.92,
          reason: 'tracking inquiry',
        })
      ),
    };

    const service = new EmailClassifierService(mockLlm);
    const result = await service.classify({
      from: 'buyer@example.com',
      subject: 'Where is my order',
      body: 'Please send tracking',
    });

    expect(mockLlm.generate).toHaveBeenCalled();
    expect(result.source).toBe('ollama');
    expect(result.category).toBe('order_status');
    expect(result.riskLevel).toBe('low');
  });

  it('falls back to heuristic when LLM fails', async () => {
    const mockLlm: LlmInferencePort = {
      model: 'test-model',
      generate: jest.fn().mockRejectedValue(new Error('ollama down')),
    };

    const service = new EmailClassifierService(mockLlm);
    const result = await service.classify({
      from: 'buyer@example.com',
      subject: 'Refund angry lawyer',
      body: 'legal complaint',
    });

    expect(result.source).toBe('heuristic');
    expect(result.riskLevel).toBe('high');
  });
});
