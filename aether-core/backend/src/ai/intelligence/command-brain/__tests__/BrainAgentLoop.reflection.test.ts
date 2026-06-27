import { BrainAgentLoop } from '../BrainAgentLoop';
import { BrainAgentPlanner } from '../BrainAgentPlanner';
import { BrainAgentReflector } from '../BrainAgentReflector';
import type { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';

describe('BrainAgentLoop reflection', () => {
  beforeEach(() => {
    process.env.COMMAND_BRAIN_PLANNING_ENABLED = 'false';
    process.env.COMMAND_BRAIN_REFLECTION_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.COMMAND_BRAIN_PLANNING_ENABLED;
    delete process.env.COMMAND_BRAIN_REFLECTION_ENABLED;
  });

  it('emits reflection and replans when reflector requests replan', async () => {
    const mockTools = {
      getSchemaPrompt: () => 'tools',
      execute: jest.fn().mockResolvedValue({
        output: 'partial data',
        trace: { tool: 'search_products', input: {}, output: 'partial', status: 'ok' as const },
      }),
    } as unknown as PersonalBrainToolRegistry;

    let llmCalls = 0;
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockImplementation(async () => {
        llmCalls += 1;
        if (llmCalls === 1) {
          return JSON.stringify({ tool: 'search_products', input: { query: 'x' } });
        }
        if (llmCalls === 2) {
          return JSON.stringify({
            sufficient: false,
            goalReached: false,
            observation: 'Meer data nodig',
            nextAction: 'replan',
          });
        }
        if (llmCalls === 3) {
          return JSON.stringify({
            goal: 'Herzien plan',
            steps: [{ label: 'Recall memory' }, { label: 'Concludeer' }],
          });
        }
        return JSON.stringify({ final: { narrative: 'Klaar na replan.' } });
      }),
    };

    const mockReflector = {
      shouldReflect: () => true,
      reflectStep: jest.fn().mockResolvedValue({
        sufficient: false,
        goalReached: false,
        observation: 'Meer data nodig',
        nextAction: 'replan',
      }),
    } as unknown as BrainAgentReflector;

    const mockPlanner = {
      shouldPlan: () => true,
      generatePlan: jest.fn().mockResolvedValue({
        goal: 'Test plan',
        steps: [{ index: 1, label: 'Zoek data' }],
      }),
      replan: jest.fn().mockResolvedValue({
        goal: 'Herzien plan',
        steps: [
          { index: 1, label: 'Recall memory' },
          { index: 2, label: 'Concludeer' },
        ],
        revision: 2,
      }),
    } as unknown as BrainAgentPlanner;

    const loop = new BrainAgentLoop(mockTools, mockLlm, undefined, mockPlanner, mockReflector);
    const events: string[] = [];

    const result = await loop.run({
      tenantId: 'tenant_refl',
      command: 'Complex task',
      parsedIntent: 'UNKNOWN',
      parameters: {},
      contextSnippets: [],
      handlerResult: 'Fallback',
      persistRun: false,
      onEvent: (e) => events.push(e.type),
    });

    expect(events).toContain('reflection');
    expect(mockPlanner.replan).toHaveBeenCalled();
    expect(events).toContain('plan_revised');
    expect(result.narrative).toContain('Klaar');
  });
});
