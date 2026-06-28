import { prisma } from '../../../../shared/prisma/client';
import { logger } from '../../../../shared/logging/logger';
import {
  explainabilityPatternContributionService,
} from '../global/ExplainabilityPatternContributionService';
import { meetsKAnonymity } from '../../global-knowledge/federated/privacyUtils';
import type { ExplainabilitySourceType } from '../types';

export class ExplainabilityPatternDistillJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    const intervalMs = parseInt(process.env.EXPLAINABILITY_PATTERN_DISTILL_INTERVAL_MS ?? '300000', 10);
    void this.runBatch();
    this.timer = setInterval(() => void this.runBatch(), intervalMs);
    logger.info('explainability_pattern_distill_job_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runBatch(): Promise<number> {
    const patternKeys = await prisma.explainabilityPatternContribution.findMany({
      select: { patternKey: true },
      distinct: ['patternKey'],
      take: 50,
    });

    let updated = 0;
    for (const { patternKey } of patternKeys) {
      const contributions = await prisma.explainabilityPatternContribution.findMany({
        where: { patternKey },
      });
      const tenantCount = contributions.length;
      const sampleSize = contributions.reduce((sum, c) => sum + c.sampleCount, 0);
      const kAnonymityMet = meetsKAnonymity(tenantCount, sampleSize);

      const existing = await prisma.globalExplainabilityPattern.findUnique({
        where: { patternKey },
      });
      if (existing) {
        await prisma.globalExplainabilityPattern.update({
          where: { patternKey },
          data: { tenantCount, sampleSize, kAnonymityMet },
        });
        updated += 1;
      }
    }
    return updated;
  }

  async distillSnapshot(params: {
    tenantId: string;
    sourceType: ExplainabilitySourceType;
    agentKeys: string[];
    triggerId?: string | null;
    intentId?: string | null;
    summary: string;
  }): Promise<void> {
    await explainabilityPatternContributionService.contributeFromSnapshot(params);
  }
}

export const explainabilityPatternDistillJob = new ExplainabilityPatternDistillJob();
