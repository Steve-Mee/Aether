import { prisma } from '../../../shared/prisma/client';
import { logger } from '../../../shared/logging/logger';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { withServerSpan } from '../../../shared/observability/sentry';
import { isGoalsEnabled, resolveGoalProgressIntervalMs, resolvePursuitCheckIntervalMs } from '../goalConfig';

export class GoalProgressJob {
  private timer: NodeJS.Timeout | null = null;
  private lastChecked = new Map<string, number>();

  start(): void {
    if (!isGoalsEnabled()) {
      logger.info('goal_progress_job_disabled');
      return;
    }
    const intervalMs = resolveGoalProgressIntervalMs();
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    logger.info('goal_progress_job_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runAll(): Promise<void> {
    const { goalProgressService } = getCompositionRoot();
    if (!goalProgressService) return;

    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      try {
        await withServerSpan(
          'goals.progress_scan',
          { tenantId: tenant.id },
          () => this.refreshDueGoals(tenant.id, goalProgressService)
        );
      } catch (error) {
        logger.warn('goal_progress_scan_failed', {
          tenantId: tenant.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private async refreshDueGoals(
    tenantId: string,
    goalProgressService: import('../GoalProgressService').GoalProgressService
  ): Promise<void> {
    const { goalRepository } = getCompositionRoot();
    const goals = await goalRepository.listActiveForProgress(tenantId);
    const now = Date.now();

    for (const goal of goals) {
      const key = `${tenantId}:${goal.id}`;
      const last = this.lastChecked.get(key) ?? 0;
      const interval = resolvePursuitCheckIntervalMs(goal.pursuitMode);
      if (now - last < interval) continue;
      this.lastChecked.set(key, now);
      await goalProgressService.refreshGoal(tenantId, goal.id, 'periodic');
    }
  }
}

export const goalProgressJob = new GoalProgressJob();
