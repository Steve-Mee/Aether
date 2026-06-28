import { createHash } from 'crypto';
import { prisma } from '../../../../shared/prisma/client';
import { getMerchantSettings } from '../../../../shared/settings/TenantSettingsService';
import { meetsKAnonymity } from '../../global-knowledge/federated/privacyUtils';
import type { ExplainabilitySourceType } from '../types';

export function buildPatternKey(params: {
  agentKeys: string[];
  triggerId?: string | null;
  intentId?: string | null;
  sourceType: string;
}): string {
  const normalized = [
    [...params.agentKeys].sort().join(','),
    params.triggerId ?? '',
    params.intentId ?? '',
    params.sourceType,
  ].join('|');
  return createHash('sha256').update(normalized).digest('hex').slice(0, 32);
}

export function anonymizeSummaryTemplate(summary: string): string {
  return summary
    .replace(/\d+\s*SKU'?s?/gi, 'meerdere SKU\'s')
    .replace(/\d+%/g, 'X%')
    .replace(/€[\d.,]+/g, '€X')
    .replace(/\d+[,.]?\d*\s*€/g, '€X')
    .slice(0, 300);
}

export class ExplainabilityPatternContributionService {
  async isContributorEnabled(tenantId: string): Promise<boolean> {
    const settings = await getMerchantSettings(tenantId);
    return settings.brainExplainabilityFederateEnabled === true;
  }

  async contributeFromSnapshot(params: {
    tenantId: string;
    agentKeys: string[];
    triggerId?: string | null;
    intentId?: string | null;
    sourceType: ExplainabilitySourceType;
    summary: string;
  }): Promise<void> {
    if (!(await this.isContributorEnabled(params.tenantId))) return;

    const patternKey = buildPatternKey(params);
    await prisma.explainabilityPatternContribution.upsert({
      where: {
        tenantId_patternKey: { tenantId: params.tenantId, patternKey },
      },
      create: {
        tenantId: params.tenantId,
        patternKey,
        sampleCount: 1,
      },
      update: {
        sampleCount: { increment: 1 },
      },
    });

    await this.aggregatePattern(patternKey, params);
  }

  private async aggregatePattern(
    patternKey: string,
    params: {
      agentKeys: string[];
      triggerId?: string | null;
      intentId?: string | null;
      sourceType: ExplainabilitySourceType;
      summary: string;
    }
  ): Promise<void> {
    const contributions = await prisma.explainabilityPatternContribution.findMany({
      where: { patternKey },
    });
    const tenantCount = contributions.length;
    const sampleSize = contributions.reduce((sum, c) => sum + c.sampleCount, 0);
    const kAnonymityMet = meetsKAnonymity(tenantCount, sampleSize);

    await prisma.globalExplainabilityPattern.upsert({
      where: { patternKey },
      create: {
        patternKey,
        agentKeys: params.agentKeys,
        triggerId: params.triggerId ?? null,
        intentId: params.intentId ?? null,
        sourceType: params.sourceType,
        summaryTemplate: anonymizeSummaryTemplate(params.summary),
        tenantCount,
        sampleSize,
        kAnonymityMet,
      },
      update: {
        agentKeys: params.agentKeys,
        triggerId: params.triggerId ?? null,
        intentId: params.intentId ?? null,
        sourceType: params.sourceType,
        summaryTemplate: anonymizeSummaryTemplate(params.summary),
        tenantCount,
        sampleSize,
        kAnonymityMet,
      },
    });
  }

  async listGlobalPatterns(params: {
    agentKeys: string[];
    triggerId?: string | null;
    intentId?: string | null;
    sourceType?: string;
    limit?: number;
  }) {
    const rows = await prisma.globalExplainabilityPattern.findMany({
      where: { kAnonymityMet: true },
      orderBy: { sampleSize: 'desc' },
      take: 30,
    });

    return rows
      .map((row) => {
        const setA = new Set(params.agentKeys);
        const setB = new Set(row.agentKeys);
        let overlap = 0;
        for (const k of setA) if (setB.has(k)) overlap += 1;
        const union = new Set([...params.agentKeys, ...row.agentKeys]).size;
        const jaccard = union === 0 ? 0 : overlap / union;
        let score = jaccard * 3;
        if (params.triggerId && params.triggerId === row.triggerId) score += 2;
        if (params.intentId && params.intentId === row.intentId) score += 2;
        if (params.sourceType && params.sourceType === row.sourceType) score += 1;
        return { row, score };
      })
      .filter((s) => s.score > 0.5)
      .sort((a, b) => b.score - a.score)
      .slice(0, params.limit ?? 2);
  }
}

export const explainabilityPatternContributionService =
  new ExplainabilityPatternContributionService();
