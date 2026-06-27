import type { QueryInsightsUseCase } from '../../../modules/zero-knowledge-hive-mind/application/use-cases/QueryInsightsUseCase';
import type { GlobalKnowledgePort, GlobalKnowledgeListFilter } from './GlobalKnowledgePort';
import type { KnowledgePatch } from './types';

const HIVE_CATEGORIES = ['pricing', 'conversion', 'trend', 'inventory', 'marketing'] as const;
const DEFAULT_METRICS = ['auto_apply_rate', 'conversion_rate', 'average_price'];

export class HiveMindGlobalKnowledgeAdapter implements GlobalKnowledgePort {
  private readonly catalogVersion = '1.0.0-hive';

  constructor(private queryInsights: QueryInsightsUseCase) {}

  getCatalogVersion(): string {
    return this.catalogVersion;
  }

  async listPatches(tenantId: string, filter?: GlobalKnowledgeListFilter): Promise<KnowledgePatch[]> {
    const targetCategories = filter?.categories?.length ? filter.categories : [...HIVE_CATEGORIES];
    const patches: KnowledgePatch[] = [];

    for (const category of targetCategories) {
      if (!HIVE_CATEGORIES.includes(category as (typeof HIVE_CATEGORIES)[number])) continue;
      for (const metric of DEFAULT_METRICS) {
        try {
          const result = await this.queryInsights.execute(
            category as (typeof HIVE_CATEGORIES)[number],
            metric,
            tenantId
          );
          if (result?.average != null && result.sampleSize >= 5) {
            patches.push({
              id: `hive:${category}:${metric}`,
              version: this.catalogVersion,
              kind: 'metric_insight',
              category,
              title: `Collectieve ${metric}`,
              content: `Gemiddelde ${metric}=${result.average} (min=${result.min}, max=${result.max}, n=${result.sampleSize})`,
              priority: result.sampleSize >= 10 ? 8 : 6,
              minProfile: 'conservative',
              tags: ['hive', metric],
            });
            break;
          }
        } catch {
          // skip failed category/metric pairs
        }
      }
    }

    return patches;
  }
}
