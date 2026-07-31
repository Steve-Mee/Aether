import type { QueryInsightsUseCase } from '../../../modules/zero-knowledge-hive-mind/application/use-cases/QueryInsightsUseCase';
import type { CollectiveInsight, GlobalBrainPort } from './GlobalBrainPort';

const HIVE_CATEGORIES = ['pricing', 'conversion', 'trend', 'inventory', 'marketing'] as const;
const DEFAULT_METRICS = ['auto_apply_rate', 'conversion_rate', 'average_price'];

export class HiveMindGlobalBrain implements GlobalBrainPort {
  readonly mode = 'hive-mind' as const;

  constructor(private queryInsights: QueryInsightsUseCase) {}

  async getCollectiveInsights(
    tenantId: string,
    categories?: string[]
  ): Promise<CollectiveInsight[]> {
    const targetCategories = categories?.length ? categories : [...HIVE_CATEGORIES];
    const results: CollectiveInsight[] = [];

    for (const category of targetCategories) {
      for (const metric of DEFAULT_METRICS) {
        const agg = await this.queryInsights.execute(category, metric, tenantId);
        if (agg?.average != null && agg.sampleSize >= 5) {
          results.push({
            category,
            summary: `avg ${metric}=${agg.average} (min=${agg.min}, max=${agg.max}, n=${agg.sampleSize})`,
            sampleSize: agg.sampleSize,
          });
          break;
        }
      }
    }

    return results;
  }
}
