export interface CollectiveInsight {
  category: string;
  summary: string;
  sampleSize: number;
}

export interface GlobalBrainPort {
  getCollectiveInsights(tenantId: string, categories?: string[]): Promise<CollectiveInsight[]>;
}
