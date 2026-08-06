import type { Insight } from '../../../modules/zero-knowledge-hive-mind/domain/entities/Insight';
import type { SubmitInsightUseCase } from '../../../modules/zero-knowledge-hive-mind/application/use-cases/SubmitInsightUseCase';
import type { QueryInsightsUseCase } from '../../../modules/zero-knowledge-hive-mind/application/use-cases/QueryInsightsUseCase';
import { logger } from '../../../shared/logging/logger';
import type {
  AnonymizedInsight,
  KnowledgeTransferPort,
  KnowledgeUpdatesResult,
  SubmitInsightsResult,
} from './KnowledgeTransferPort';
import { isKnowledgeTransferEnabledForCategory } from './categoryPreferences';
import type { ContributionCategory } from './contribution/contributionTaxonomy';

const HIVE_CATEGORIES = new Set([
  'pricing',
  'conversion',
  'trend',
  'inventory',
  'marketing',
]);

const DEFAULT_METRICS = ['auto_apply_rate', 'conversion_rate', 'average_price'];

function isHiveCategory(category: string): category is Insight['category'] {
  return HIVE_CATEGORIES.has(category);
}

export class HiveMindKnowledgeTransferAdapter implements KnowledgeTransferPort {
  private enabled = process.env.INTELLIGENCE_KNOWLEDGE_TRANSFER_ENABLED === 'true';

  constructor(
    private submitInsight: SubmitInsightUseCase,
    private queryInsights: QueryInsightsUseCase
  ) {}

  async getKnowledgeUpdates(merchantId: string): Promise<KnowledgeUpdatesResult> {
    if (!this.enabled) {
      return { updates: [], version: '0.0.0' };
    }

    const updates: KnowledgeUpdatesResult['updates'] = [];
    for (const category of HIVE_CATEGORIES) {
      const categoryEnabled = await isKnowledgeTransferEnabledForCategory(
        merchantId,
        category as ContributionCategory
      );
      if (!categoryEnabled) continue;

      for (const metric of DEFAULT_METRICS) {
        try {
          const result = await this.queryInsights.execute(category, metric, merchantId);
          if (result?.average != null && result.sampleSize >= 5) {
            updates.push({
              id: `${category}:${metric}`,
              category,
              summary: `avg ${metric}=${result.average} (n=${result.sampleSize})`,
              appliedAt: new Date().toISOString(),
            });
          }
        } catch {
          // skip failed category/metric pairs
        }
      }
    }

    return { updates, version: '1.0.0' };
  }

  async submitAnonymizedInsights(
    merchantId: string,
    insights: AnonymizedInsight[]
  ): Promise<SubmitInsightsResult> {
    if (!this.enabled) {
      return { accepted: true, count: 0 };
    }

    let count = 0;
    for (const item of insights) {
      if (!isHiveCategory(item.category)) {
        logger.warn('knowledge_transfer_invalid_category', { category: item.category });
        continue;
      }

      const categoryEnabled = await isKnowledgeTransferEnabledForCategory(
        merchantId,
        item.category
      );
      if (!categoryEnabled) {
        logger.debug('knowledge_transfer_category_opted_out', {
          merchantId,
          category: item.category,
        });
        continue;
      }

      try {
        const insight: Insight = {
          id: '',
          merchantId,
          category: item.category,
          metric: item.metric,
          value: item.value,
          sampleSize: item.sampleSize ?? 1,
          confidence: 0.7,
          timestamp: new Date(),
        };
        await this.submitInsight.execute(insight, merchantId);
        count++;
      } catch (error) {
        logger.warn('knowledge_transfer_submit_failed', {
          merchantId,
          category: item.category,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return { accepted: count > 0 || insights.length === 0, count };
  }
}
