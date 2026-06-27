import { BrainAgentLoop } from '../BrainAgentLoop';
import type { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';

jest.mock('../BrainAgentRunStore', () => ({
  createBrainAgentRun: jest.fn(),
  updateBrainAgentRun: jest.fn(),
  updateBrainAgentRunCheckpoint: jest.fn(),
  getBrainAgentRunById: jest.fn().mockResolvedValue(null),
  cancelBrainAgentRun: jest.fn().mockResolvedValue(true),
  parseResumeContext: jest.fn(),
}));

describe('BrainAgentLoop cancel', () => {
  beforeEach(() => {
    process.env.COMMAND_BRAIN_PLANNING_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.COMMAND_BRAIN_PLANNING_ENABLED;
  });

  it('stops when abort signal is triggered', async () => {
    const mockTools = {
      getSchemaPrompt: () => 'tools',
      execute: jest.fn(),
    } as unknown as PersonalBrainToolRegistry;

    const abortController = new AbortController();
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockImplementation(async () => {
        abortController.abort();
        return JSON.stringify({ tool: 'search_products', input: {} });
      }),
    };

    const loop = new BrainAgentLoop(mockTools, mockLlm);
    const result = await loop.run({
      tenantId: 'tenant_cancel',
      command: 'Test',
      parsedIntent: 'UNKNOWN',
      parameters: {},
      contextSnippets: [],
      handlerResult: 'Fallback',
      persistRun: false,
      abortSignal: abortController.signal,
    });

    expect(result.runStatus).toBe('cancelled');
    expect(mockTools.execute).not.toHaveBeenCalled();
  });
});
