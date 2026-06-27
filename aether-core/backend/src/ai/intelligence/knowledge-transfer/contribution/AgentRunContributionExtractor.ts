import type { AgentRunSummary } from '../../command-brain/types/AgentPlan';
import type { BrainToolTraceEntry } from '../../personal-brain/tools/types';
import type { AnonymizedInsight } from '../KnowledgeTransferPort';
import { mapIntentToCategory, mapToolToCategory } from './contributionTaxonomy';

export interface AgentRunContributionInput {
  parsedIntent: string;
  summary: AgentRunSummary;
  toolTrace: BrainToolTraceEntry[];
  goalReached: boolean;
}

export class AgentRunContributionExtractor {
  /**
   * Extracts structured metrics from a completed agent run.
   * Never includes narrative, plan labels, or command text.
   */
  extract(input: AgentRunContributionInput): AnonymizedInsight[] {
    const { parsedIntent, summary, toolTrace, goalReached } = input;

    if (!goalReached || toolTrace.length < 2) {
      return [];
    }

    const insights: AnonymizedInsight[] = [];
    const category = mapIntentToCategory(parsedIntent);
    const completedCount = summary.completedSteps.length;

    insights.push({
      category,
      metric: 'agent_run_success_rate',
      value: 1,
      sampleSize: Math.max(1, completedCount),
    });

    if (parsedIntent === 'PRICE_UPDATE') {
      insights.push({
        category: 'pricing',
        metric: 'price_change_success_rate',
        value: 1,
        sampleSize: Math.max(1, completedCount),
      });
    }

    for (const entry of toolTrace) {
      const toolCategory = mapToolToCategory(entry.tool);
      const ok = entry.status === 'ok' || entry.status === undefined;
      insights.push({
        category: toolCategory,
        metric: `${entry.tool}_success_rate`,
        value: ok ? 1 : 0,
        sampleSize: 1,
      });
    }

    return insights;
  }
}
