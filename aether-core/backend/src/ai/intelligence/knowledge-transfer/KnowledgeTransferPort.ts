export interface AnonymizedInsight {
  category: string;
  metric: string;
  value: number;
  sampleSize?: number;
}

export interface KnowledgeUpdate {
  id: string;
  category: string;
  summary: string;
  appliedAt?: string;
}

export interface KnowledgeUpdatesResult {
  updates: KnowledgeUpdate[];
  version: string;
}

export interface SubmitInsightsResult {
  accepted: boolean;
  count: number;
}

export interface KnowledgeTransferPort {
  getKnowledgeUpdates(merchantId: string): Promise<KnowledgeUpdatesResult>;
  submitAnonymizedInsights(
    merchantId: string,
    insights: AnonymizedInsight[]
  ): Promise<SubmitInsightsResult>;
}
