import { extractReflectionInsights } from '../ReflectionContributionExtractor';
import type { ExperienceReflection } from '../../../personal-brain/reflection/types';

describe('ReflectionContributionExtractor', () => {
  const base: ExperienceReflection = {
    goal: 'Test',
    stepsTaken: ['stap'],
    outcome: 'ok',
    wentWell: ['goed'],
    couldImprove: [],
    futureLearnings: ['leer'],
    trigger: 'multi_step',
    success: true,
    intent: 'PRICE_UPDATE',
    command: 'secret merchant command',
    toolsUsed: ['updatePrice'],
  };

  it('extracts structured metrics without free text', () => {
    const insights = extractReflectionInsights(base);
    expect(insights.length).toBeGreaterThan(0);
    for (const insight of insights) {
      expect(insight.value).toBeGreaterThanOrEqual(0);
      expect(insight.value).toBeLessThanOrEqual(1);
      expect(JSON.stringify(insight)).not.toContain('secret merchant');
    }
    expect(insights.some((i) => i.metric === 'multi_step_completion_rate')).toBe(true);
    expect(insights.some((i) => i.metric === 'updatePrice_success_rate')).toBe(true);
  });

  it('includes reflection_failure_rate for failure trigger', () => {
    const insights = extractReflectionInsights({ ...base, success: false, trigger: 'failure' });
    expect(insights.some((i) => i.metric === 'reflection_failure_rate')).toBe(true);
  });
});
