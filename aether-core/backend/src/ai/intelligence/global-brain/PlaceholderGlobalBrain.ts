import type { CollectiveInsight, GlobalBrainPort } from './GlobalBrainPort';

/**
 * Placeholder until federated collective intelligence is wired to hive-mind aggregates.
 * Always empty; mode is exposed so callers/health can distinguish from a live GlobalBrain.
 */
export class PlaceholderGlobalBrain implements GlobalBrainPort {
  readonly mode = 'placeholder' as const;

  async getCollectiveInsights(_tenantId: string, _categories?: string[]): Promise<CollectiveInsight[]> {
    return [];
  }
}
