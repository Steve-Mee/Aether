import { BrainAgentReflector } from '../BrainAgentReflector';
import { normalizeStepReflection } from '../types/StepReflection';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';

describe('StepReflection helpers', () => {
  it('normalizes valid reflection JSON', () => {
    const r = normalizeStepReflection({
      sufficient: false,
      goalReached: false,
      observation: 'Onvoldoende data',
      nextAction: 'replan',
    });
    expect(r.nextAction).toBe('replan');
    expect(r.sufficient).toBe(false);
  });
});

describe('BrainAgentReflector', () => {
  it('returns continue when reflection disabled', async () => {
    process.env.COMMAND_BRAIN_REFLECTION_ENABLED = 'false';
    const reflector = new BrainAgentReflector();
    const result = await reflector.reflectStep({
      command: 'test',
      plan: { goal: 'Doel', steps: [{ index: 1, label: 'Stap 1' }] },
      planStepIndex: 1,
      tool: 'search_products',
      toolOutput: 'ok',
    });
    expect(result.nextAction).toBe('continue');
    delete process.env.COMMAND_BRAIN_REFLECTION_ENABLED;
  });

  it('parses LLM reflection response', async () => {
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          sufficient: true,
          goalReached: true,
          observation: 'Doel bereikt',
          nextAction: 'conclude',
        })
      ),
    };
    const reflector = new BrainAgentReflector(mockLlm);
    const result = await reflector.reflectStep({
      command: 'test',
      plan: { goal: 'Doel', steps: [{ index: 1, label: 'Stap 1' }] },
      planStepIndex: 1,
      tool: 'search_products',
      toolOutput: 'found products',
    });
    expect(result.nextAction).toBe('conclude');
    expect(result.goalReached).toBe(true);
  });
});
