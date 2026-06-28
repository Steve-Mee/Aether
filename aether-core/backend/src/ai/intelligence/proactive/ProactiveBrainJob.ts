import { prisma } from '../../../shared/prisma/client';
import { logger } from '../../../shared/logging/logger';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { withServerSpan } from '../../../shared/observability/sentry';
import { isProactiveBrainEnabled, resolveProactiveBrainIntervalMs } from './proactiveConfig';

export class ProactiveBrainJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (!isProactiveBrainEnabled()) {
      logger.info('proactive_brain_job_disabled');
      return;
    }
    const intervalMs = resolveProactiveBrainIntervalMs();
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    logger.info('proactive_brain_job_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runAll(): Promise<void> {
    const { proactiveSuggestionService } = getCompositionRoot();
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      try {
        await withServerSpan(
          'proactive.brain_scan',
          { tenantId: tenant.id },
          () => proactiveSuggestionService.evaluateAndIngestPeriodic(tenant.id)
        );
      } catch (error) {
        logger.warn('proactive_brain_scan_failed', {
          tenantId: tenant.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

export const proactiveBrainJob = new ProactiveBrainJob();
