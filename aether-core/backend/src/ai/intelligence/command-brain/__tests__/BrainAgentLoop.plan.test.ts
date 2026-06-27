import { BrainAgentLoop } from '../BrainAgentLoop';
import { BrainAgentPlanner } from '../BrainAgentPlanner';
import type { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import type { AgentPlan } from '../types/AgentPlan';

describe('BrainAgentLoop planning', () => {
  beforeEach(() => {
    process.env.COMMAND_BRAIN_REFLECTION_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.COMMAND_BRAIN_REFLECTION_ENABLED;
  });

  const mockPlan: AgentPlan = {
    goal: 'Prijzen optimaliseren',
    steps: [
      { index: 1, label: 'Haal producten op', toolHint: 'search_products', riskHint: 'low' },
      { index: 2, label: 'Concludeer', riskHint: 'low' },
    ],
    reasoning: 'Data eerst',
  };

  const mockTools = {
    getSchemaPrompt: () => 'tools',
    execute: jest.fn().mockResolvedValue({
      output: 'found 1 product',
      trace: { tool: 'search_products', input: {}, output: 'ok', status: 'ok' as const },
    }),
  } as unknown as PersonalBrainToolRegistry;

  const mockLlm: LlmInferencePort = {
    model: 'test',
    generate: jest
      .fn()
      .mockResolvedValueOnce(JSON.stringify({ tool: 'search_products', input: { query: 'x' } }))
      .mockResolvedValueOnce(
        JSON.stringify({ final: { narrative: 'Klaar met analyse.', actionProposal: 'Monitor' } })
      ),
  };

  const mockPlanner = {
    shouldPlan: () => true,
    generatePlan: jest.fn().mockResolvedValue(mockPlan),
    replan: jest.fn(),
  } as unknown as BrainAgentPlanner;

  it('emits plan_ready and includes plan in transcript', async () => {
    const loop = new BrainAgentLoop(mockTools, mockLlm, undefined, mockPlanner);
    const events: string[] = [];

    const result = await loop.run({
      tenantId: 'tenant_plan',
      command: 'Optimaliseer prijzen',
      parsedIntent: 'PRICE_UPDATE',
      parameters: {},
      contextSnippets: [],
      handlerResult: 'Handler',
      persistRun: false,
      onEvent: (e) => events.push(e.type),
    });

    expect(mockPlanner.generatePlan).toHaveBeenCalled();
    expect(events).toContain('plan_ready');
    expect(events).toContain('step_progress');
    expect(result.plan?.goal).toBe('Prijzen optimaliseren');
    expect(result.transcript?.some((m) => m.role === 'plan')).toBe(true);
    expect(result.summary?.goalReached).toBe(true);
  });
});
