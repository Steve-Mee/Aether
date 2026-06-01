import { Insight } from '../entities/Insight';

export interface HiveMindRepository {
  submitInsight(insight: Insight, tenantId: string): Promise<Insight>;
  getAggregatedInsights(category: string, metric: string, tenantId: string): Promise<Insight[]>;
  getInsightsByCategory(category: string, tenantId: string): Promise<Insight[]>;
}
