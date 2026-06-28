import { prisma } from '../../../../shared/prisma/client';
import { logger } from '../../../../shared/logging/logger';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { isProactiveLlmEnrichmentEnabled } from '../proactiveConfig';

export class ProactiveEnrichmentJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (!isProactiveLlmEnrichmentEnabled()) {
      logger.info('proactive_enrichment_job_disabled');
      return;
    }
    const intervalMs = parseInt(process.env.PROACTIVE_ENRICHMENT_JOB_INTERVAL_MS ?? '300000', 10);
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    logger.info('proactive_enrichment_job_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runAll(): Promise<void> {
    const { proactiveEnrichmentService } = getCompositionRoot();
    if (!proactiveEnrichmentService) return;

    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      try {
        await proactiveEnrichmentService.processPendingBatch(tenant.id);
      } catch (error) {
        logger.warn('proactive_enrichment_batch_failed', {
          tenantId: tenant.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

export const proactiveEnrichmentJob = new ProactiveEnrichmentJob();
