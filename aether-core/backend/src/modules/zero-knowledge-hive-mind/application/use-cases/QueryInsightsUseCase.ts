import { HiveMindRepository } from '../../domain/repositories/HiveMindRepository';
import { AggregationService } from '../services/AggregationService';

export class QueryInsightsUseCase {
  constructor(
    private repository: HiveMindRepository,
    private aggregationService: AggregationService
  ) {}

  async execute(category: string, metric: string, tenantId: string): Promise<any> {
    const insights = await this.repository.getInsightsByCategory(category, tenantId);
    const filtered = insights.filter(i => i.metric === metric);

    if (filtered.length < 5) {
      return { message: 'Not enough data for reliable aggregation', sampleSize: filtered.length };
    }

    return this.aggregationService.aggregateInsights(filtered);
  }
}