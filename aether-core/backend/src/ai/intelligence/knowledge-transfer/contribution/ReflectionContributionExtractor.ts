import type { ExperienceReflection } from '../../personal-brain/reflection/types';
import type { AnonymizedInsight } from '../KnowledgeTransferPort';
import { mapIntentToCategory, mapToolToCategory } from './contributionTaxonomy';

export function extractReflectionInsights(reflection: ExperienceReflection): AnonymizedInsight[] {
  const insights: AnonymizedInsight[] = [];
  const category = mapIntentToCategory(reflection.intent);
  const successValue = reflection.success ? 1 : 0;

  insights.push({
    category,
    metric: 'agent_run_success_rate',
    value: successValue,
    sampleSize: 1,
  });

  if (reflection.trigger === 'failure') {
    insights.push({
      category,
      metric: 'reflection_failure_rate',
      value: 1,
      sampleSize: 1,
    });
  }

  if (reflection.trigger === 'multi_step') {
    insights.push({
      category,
      metric: 'multi_step_completion_rate',
      value: reflection.success ? 1 : 0,
      sampleSize: 1,
    });
  }

  if (reflection.trigger === 'high_impact') {
    insights.push({
      category,
      metric: 'high_impact_success_rate',
      value: reflection.success ? 1 : 0,
      sampleSize: 1,
    });
  }

  for (const tool of reflection.toolsUsed ?? []) {
    insights.push({
      category: mapToolToCategory(tool),
      metric: `${tool}_success_rate`,
      value: successValue,
      sampleSize: 1,
    });
  }

  return insights;
}
