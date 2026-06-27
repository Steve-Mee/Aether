import { LlmDistillationAdapter } from '../LlmDistillationAdapter';

describe('LlmDistillationAdapter distillReflections', () => {
  it('returns null when LLM distillation disabled', async () => {
    const prev = process.env.INTELLIGENCE_DISTILLATION_LLM;
    process.env.INTELLIGENCE_DISTILLATION_LLM = 'false';
    const adapter = new LlmDistillationAdapter();
    const result = await adapter.distillReflections({
      reflections: [
        {
          goal: 'Summarize inbox',
          stepsTaken: ['fetch'],
          outcome: 'ok',
          wentWell: ['fast'],
          couldImprove: [],
          futureLearnings: ['batch emails'],
          trigger: 'multi_step',
          success: true,
          intent: 'EMAIL_SUMMARY',
          command: 'email summary',
        },
      ],
      reflectionIds: ['r1'],
      agentKeys: ['mail'],
    });
    expect(result).toBeNull();
    process.env.INTELLIGENCE_DISTILLATION_LLM = prev;
  });
});
