import { Insight } from '../entities/Insight';

export interface HiveMindRepository {
  submitInsight(insight: Insight): Promise<Insight>;
  getAggregatedInsights(category: string, metric: string): Promise<any>;
  getInsightsByCategory(category: string): Promise<Insight[]>;
}