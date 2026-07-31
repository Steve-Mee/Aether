export interface CollectiveInsight {
  category: string;
  summary: string;
  sampleSize: number;
}

export type GlobalBrainMode = 'placeholder' | 'hive-mind';

export interface GlobalBrainPort {
  /** Honest mode label — placeholder returns empty insights by design. */
  readonly mode?: GlobalBrainMode;
  getCollectiveInsights(tenantId: string, categories?: string[]): Promise<CollectiveInsight[]>;
}
