import crypto from 'crypto';
import { HiveMindRepository } from '../../domain/repositories/HiveMindRepository';
import { Insight } from '../../domain/entities/Insight';
import { privacyBudgetService } from '../../wiring';
import { createInsightCommitment } from '../services/ZkProofService';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class SubmitInsightUseCase {
  constructor(private repository: HiveMindRepository) {}

  async execute(insight: Insight, tenantId: string): Promise<Insight> {
    const tid = requireTenantId(tenantId, 'SubmitInsightUseCase.execute');
    if (!insight.category || !insight.metric || insight.value === undefined) {
      throw new Error('Invalid insight data');
    }

    const canSpend = await privacyBudgetService.canSpend(tid);
    if (!canSpend) {
      throw new Error('Privacy budget exceeded');
    }

    const salt = process.env.HIVE_MIND_SALT ?? 'aether-dev-salt';
    const anonymizedMerchantId = crypto
      .createHmac('sha256', salt)
      .update(insight.merchantId)
      .digest('hex')
      .slice(0, 16);

    const anonymizedInsight: Insight = {
      ...insight,
      merchantId: anonymizedMerchantId,
      timestamp: new Date(),
      zkProof: createInsightCommitment({
        merchantId: anonymizedMerchantId,
        category: insight.category,
        metric: insight.metric,
        value: insight.value,
        sampleSize: insight.sampleSize,
        timestamp: new Date(),
      }),
    };

    const saved = await this.repository.submitInsight(anonymizedInsight, tenantId);
    await privacyBudgetService.spend(tid);
    return saved;
  }
}
