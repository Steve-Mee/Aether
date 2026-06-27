import type { KnowledgeContributionService } from '../knowledge-transfer/contribution/KnowledgeContributionService';

/**
 * Thin delegate for tool outcome → global knowledge contribution.
 */
export class BrainToolKnowledgeTransferService {
  constructor(private contribution?: KnowledgeContributionService) {}

  async submitToolOutcome(
    tenantId: string,
    params: {
      tool: string;
      approved: boolean;
      risk: string;
    }
  ): Promise<void> {
    if (!this.contribution) return;

    try {
      await this.contribution.contributeFromToolOutcome(tenantId, params);
    } catch {
      // best-effort anonymized submit
    }
  }
}
