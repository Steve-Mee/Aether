import { prisma } from '../../../shared/prisma/client';
import { logger } from '../../../shared/logging/logger';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { isGoalAiSuggestionsEnabled } from '../goalConfig';
import { GOAL_SUGGESTION_INTERVAL_MS } from '../goalConfig';

export class GoalSuggestionJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (!isGoalAiSuggestionsEnabled()) {
      logger.info('goal_suggestion_job_disabled');
      return;
    }
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), GOAL_SUGGESTION_INTERVAL_MS);
    logger.info('goal_suggestion_job_started', { intervalMs: GOAL_SUGGESTION_INTERVAL_MS });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runAll(): Promise<void> {
    const { goalSuggestionEngine } = getCompositionRoot();
    if (!goalSuggestionEngine) return;

    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      try {
        await goalSuggestionEngine.scanTenant(tenant.id);
      } catch (error) {
        logger.warn('goal_suggestion_scan_failed', {
          tenantId: tenant.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }
}

export const goalSuggestionJob = new GoalSuggestionJob();
