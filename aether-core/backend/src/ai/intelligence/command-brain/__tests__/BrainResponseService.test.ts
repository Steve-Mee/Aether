import { BrainResponseService } from '../BrainResponseService';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';

describe('BrainResponseService', () => {
  it('returns LLM narrative when generation succeeds', async () => {
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          narrative: 'Wireless Earbuds Pro staat op €49,99 met 85 stuks voorraad. Prijsverhoging van 5% is uitgevoerd.',
          actionProposal: 'Monitor marge na prijsupdate.',
        })
      ),
    };

    const service = new BrainResponseService(mockLlm);
    const result = await service.generateResponse({
      tenantId: 'tenant_test',
      command: 'Optimaliseer prijzen voor Wireless Earbuds',
      parsedIntent: 'INVENTORY_STATUS',
      parameters: { percentage: 5, product: 'Wireless Earbuds' },
      contextSnippets: ['[product] Wireless Earbuds Pro | price=49.99 EUR | stock=85'],
      handlerResult: 'Updated prices on 1 product(s) by 5%',
    });

    expect(result.narrative).toContain('Wireless Earbuds');
    expect(result.actionProposal).toContain('Monitor');
  });

  it('falls back to handlerResult when LLM fails', async () => {
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockRejectedValue(new Error('Ollama unavailable')),
    };

    const service = new BrainResponseService(mockLlm);
    const handlerResult = 'Updated prices on 1 products by 5%';
    const result = await service.generateResponse({
      tenantId: 'tenant_test',
      command: 'verhoog prijs',
      parsedIntent: 'INVENTORY_STATUS',
      parameters: {},
      contextSnippets: [],
      handlerResult,
    });

    expect(result.narrative).toBe(handlerResult);
    expect(result.error).toContain('Ollama unavailable');
  });
});
