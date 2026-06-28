import { ExplainabilityNarrativeService } from '../ExplainabilityNarrativeService';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';

describe('ExplainabilityNarrativeService', () => {
  it('falls back when LLM returns empty', async () => {
    const llm = {
      generate: jest.fn().mockResolvedValue(''),
      model: 'test',
    } as unknown as LlmInferencePort;
    const service = new ExplainabilityNarrativeService(llm);
    const result = await service.generateSummary(
      {
        agents: [{ agentKey: 'inventory', role: 'specialist', label: 'Voorraad' }],
        dataSources: [],
        reasoningSteps: [],
        reflections: [],
        handoffChain: [],
        policyNotes: [],
      },
      'Template summary'
    );
    expect(result).toBeNull();
  });

  it('returns LLM text when valid', async () => {
    const llm = {
      generate: jest.fn().mockResolvedValue('De voorraad-agent heeft lage voorraad gedetecteerd.'),
      model: 'test',
    } as unknown as LlmInferencePort;
    const service = new ExplainabilityNarrativeService(llm);
    const result = await service.generateSummary(
      {
        agents: [{ agentKey: 'inventory', role: 'specialist', label: 'Voorraad' }],
        dataSources: [],
        reasoningSteps: [],
        reflections: [],
        handoffChain: [],
        policyNotes: [],
      },
      'Template'
    );
    expect(result).toContain('voorraad-agent');
  });
});
