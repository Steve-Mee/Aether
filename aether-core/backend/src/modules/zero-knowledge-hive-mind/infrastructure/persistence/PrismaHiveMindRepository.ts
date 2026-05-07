import { HiveMindRepository } from '../../domain/repositories/HiveMindRepository';
import { Insight } from '../../domain/entities/Insight';
import { PrismaClient } from '@prisma/client';

export class PrismaHiveMindRepository implements HiveMindRepository {
  private prisma = new PrismaClient();

  async submitInsight(insight: Insight): Promise<Insight> {
    const created = await this.prisma.hiveInsight.create({
      data: {
        id: insight.id,
        merchantId: insight.merchantId,
        category: insight.category,
        metric: insight.metric,
        value: insight.value,
        sampleSize: insight.sampleSize,
        confidence: insight.confidence,
        timestamp: insight.timestamp
      }
    });

    return created as Insight;
  }

  async getInsightsByCategory(category: string): Promise<Insight[]> {
    return this.prisma.hiveInsight.findMany({
      where: { category }
    }) as Promise<Insight[]>;
  }

  async getAggregatedInsights(category: string, metric: string): Promise<any> {
    // For now, simple aggregation in service layer
    return this.getInsightsByCategory(category);
  }
}