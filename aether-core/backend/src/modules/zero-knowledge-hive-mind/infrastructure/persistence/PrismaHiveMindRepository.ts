import { HiveMindRepository } from '../../domain/repositories/HiveMindRepository';
import { Insight } from '../../domain/entities/Insight';
import { PrismaClient } from '@prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaHiveMindRepository implements HiveMindRepository {
  constructor(private prisma: PrismaClient) {}

  async submitInsight(insight: Insight, tenantId: string): Promise<Insight> {
    const tid = requireTenantId(tenantId, 'PrismaHiveMindRepository.submitInsight');
    const created = await this.prisma.insight.create({
      data: {
        id: insight.id,
        tenantId: tid,
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
      },
    });

    return this.toDomain(created);
  }

  async getInsightsByCategory(category: string, tenantId: string): Promise<Insight[]> {
    const tid = requireTenantId(tenantId, 'PrismaHiveMindRepository.getInsightsByCategory');
    const rows = await this.prisma.insight.findMany({
      where: { type: category, tenantId: tid },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async getAggregatedInsights(
    category: string,
    _metric: string,
    tenantId: string
  ): Promise<Insight[]> {
    return this.getInsightsByCategory(category, tenantId);
  }

  private toDomain(row: { id: string; type: string; content: string; createdAt: Date }): Insight {
    const parsed = this.parseContent(row.content);
    return {
      id: row.id,
      merchantId: String(parsed.merchantId ?? 'unknown'),
      category: (row.type as Insight['category']) ?? 'trend',
      metric: String(parsed.metric ?? 'unknown'),
      value: Number(parsed.value ?? 0),
      sampleSize: Number(parsed.sampleSize ?? 0),
      confidence: Number(parsed.confidence ?? 0),
      timestamp: parsed.timestamp ? new Date(String(parsed.timestamp)) : row.createdAt,
      zkProof: parsed.zkProof != null ? String(parsed.zkProof) : undefined,
    };
  }

  private parseContent(content: string): Record<string, unknown> {
    try {
      return JSON.parse(content) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
}
