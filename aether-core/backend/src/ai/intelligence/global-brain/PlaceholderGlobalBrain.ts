import type { CollectiveInsight, GlobalBrainPort } from './GlobalBrainPort';

/**
 * Placeholder until federated collective intelligence is wired to hive-mind aggregates.
 */
export class PlaceholderGlobalBrain implements GlobalBrainPort {
  async getCollectiveInsights(_tenantId: string, _categories?: string[]): Promise<CollectiveInsight[]> {
    return [];
  }
}
