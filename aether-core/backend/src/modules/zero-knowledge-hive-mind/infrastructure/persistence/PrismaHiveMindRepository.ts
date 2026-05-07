import { HiveMindRepository } from '../../domain/repositories/HiveMindRepository';
import { Insight } from '../../domain/entities/Insight';
import { PrismaClient } from '@prisma/client';

export class PrismaHiveMindRepository implements HiveMindRepository {
  private prisma = new PrismaClient();

  async submitInsight(insight: Insight): Promise<Insight> {
    const created = await this.prisma.insight.create({
      data: {
        id: insight.id,
        type: insight.category,
        content: JSON.stringify({
          merchantId: insight.merchantId,
          metric: insight.metric,
          value: insight.value,
          sampleSize: insight.sampleSize,
          confidence: insight.confidence,
          timestamp: insight.timestamp,
          zkProof: insight.zkProof,
        }),
      }
    });

    return this.toDomain(created);
  }

  async getInsightsByCategory(category: string): Promise<Insight[]> {
    const rows = await this.prisma.insight.findMany({
      where: { type: category },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async getAggregatedInsights(category: string, metric: string): Promise<any> {
    // For now, simple aggregation in service layer
    return this.getInsightsByCategory(category);
  }

  private toDomain(row: { id: string; type: string; content: string; createdAt: Date }): Insight {
    const parsed = this.parseContent(row.content);
    return {
      id: row.id,
      merchantId: parsed.merchantId ?? 'unknown',
      category: (row.type as Insight['category']) ?? 'trend',
      metric: parsed.metric ?? 'unknown',
      value: parsed.value ?? 0,
      sampleSize: parsed.sampleSize ?? 0,
      confidence: parsed.confidence ?? 0,
      timestamp: parsed.timestamp ? new Date(parsed.timestamp) : row.createdAt,
      zkProof: parsed.zkProof,
    };
  }

  private parseContent(content: string): Record<string, any> {
    try {
      return JSON.parse(content);
    } catch {
      return {};
    }
  }
}