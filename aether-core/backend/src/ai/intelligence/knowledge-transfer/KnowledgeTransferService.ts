import type {
  AnonymizedInsight,
  KnowledgeTransferPort,
  KnowledgeUpdatesResult,
  SubmitInsightsResult,
} from './KnowledgeTransferPort';

/**
 * Knowledge exchange between personal and global brain.
 *
 * Without a hive-mind bridge this service does not persist or forward insights.
 * It must never claim `accepted: true` while discarding payloads.
 * Wire HiveMindKnowledgeTransferAdapter via IntelligenceLayerDeps for real transfer.
 */
export class KnowledgeTransferService implements KnowledgeTransferPort {
  private enabled = process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED === 'true';

  async getKnowledgeUpdates(merchantId: string): Promise<KnowledgeUpdatesResult> {
    if (!this.enabled) {
      return { updates: [], version: '0.0.0' };
    }
    // No hive bridge in this implementation — honest empty result
    void merchantId;
    return { updates: [], version: '0.0.0' };
  }

  async submitAnonymizedInsights(
    merchantId: string,
    insights: AnonymizedInsight[]
  ): Promise<SubmitInsightsResult> {
    // Disabled or no hive bridge: do not claim acceptance while discarding
    void merchantId;
    void insights;
    return { accepted: false, count: 0 };
  }
}
