import { HiveMindRepository } from '../../domain/repositories/HiveMindRepository';
import { Insight } from '../../domain/entities/Insight';

export class SubmitInsightUseCase {
  constructor(private repository: HiveMindRepository) {}

  async execute(insight: Insight): Promise<Insight> {
    // Basic validation
    if (!insight.category || !insight.metric || insight.value === undefined) {
      throw new Error('Invalid insight data');
    }

    // Anonymize merchant ID (in real version: hash + salt)
    const anonymizedInsight: Insight = {
      ...insight,
      merchantId: 'anonymized_' + insight.merchantId.slice(0, 8),
      timestamp: new Date()
    };

    return this.repository.submitInsight(anonymizedInsight);
  }
}