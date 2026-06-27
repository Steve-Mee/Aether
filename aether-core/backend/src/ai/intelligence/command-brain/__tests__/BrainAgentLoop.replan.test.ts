import { BrainAgentLoop } from '../BrainAgentLoop';
import type { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';

describe('BrainAgentLoop replan', () => {
  beforeEach(() => {
    process.env.COMMAND_BRAIN_PLANNING_ENABLED = 'false';
    process.env.COMMAND_BRAIN_REFLECTION_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.COMMAND_BRAIN_PLANNING_ENABLED;
    delete process.env.COMMAND_BRAIN_REFLECTION_ENABLED;
  });

  it('calls planner.replan after tool error then succeeds', async () => {
    let callCount = 0;
    const mockTools = {
      getSchemaPrompt: () => 'tools',
      execute: jest
        .fn()
        .mockResolvedValueOnce({
          output: 'Tool failed',
          trace: { tool: 'search_products', input: {}, output: 'Tool failed', status: 'error' as const },
        })
        .mockResolvedValueOnce({
          output: 'ok',
          trace: { tool: 'recall_memory', input: {}, output: 'ok', status: 'ok' as const },
        }),
    } as unknown as PersonalBrainToolRegistry;

    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          return JSON.stringify({ tool: 'search_products', input: { query: 'x' } });
        }
        if (callCount === 2) {
          return JSON.stringify({
            goal: 'Hersteld plan',
            steps: [{ label: 'Probeer recall', toolHint: 'recall_memory' }],
          });
        }
        if (callCount === 3) {
          return JSON.stringify({ tool: 'recall_memory', input: { query: 'y' } });
        }
        return JSON.stringify({ final: { narrative: 'Hersteld na fout.' } });
      }),
    };

    const loop = new BrainAgentLoop(mockTools, mockLlm);
    const events: string[] = [];
    const result = await loop.run({
      tenantId: 'tenant_replan',
      command: 'Test replan',
      parsedIntent: 'UNKNOWN',
      parameters: {},
      contextSnippets: [],
      handlerResult: 'Fallback',
      persistRun: false,
      onEvent: (e) => events.push(e.type),
    });

    expect(result.narrative).toContain('Hersteld');
    expect(result.runStatus).toBe('completed');
    expect(mockTools.execute).toHaveBeenCalledTimes(2);
    expect(events).toContain('plan_revised');
  });
});
