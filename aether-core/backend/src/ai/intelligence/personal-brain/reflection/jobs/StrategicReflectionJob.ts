import { prisma } from '../../../../../shared/prisma/client';
import { logger } from '../../../../../shared/logging/logger';
import { getCompositionRoot } from '../../../../../bootstrap/compositionRoot';
import type { PersonalBrainMemoryService } from '../../memory/PersonalBrainMemoryService';
import { isStrategicReflectionEnabled } from '../StrategicReflectionService';
import type { ActiveGoalSnapshot } from '../strategicTypes';
import type { MerchantGoalRecord } from '../../../goals/types';

/**
 * Periodic job that runs strategic reflection per tenant and stores adaptations in LTM.
 * Enabled when PERSONAL_BRAIN_STRATEGIC_REFLECTION_JOB_ENABLED=true (default: true when reflection enabled).
 */
export class StrategicReflectionJob {
  private timer: NodeJS.Timeout | null = null;

  constructor(private getMemoryService: () => PersonalBrainMemoryService) {}

  start(): void {
    if (!isStrategicReflectionEnabled()) return;
    if (process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_JOB_ENABLED === 'false') return;

    const intervalMs = parseInt(
      process.env.PERSONAL_BRAIN_STRATEGIC_REFLECTION_INTERVAL_MS ?? String(24 * 60 * 60 * 1000),
      10
    );
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async runAll(): Promise<void> {
    if (!isStrategicReflectionEnabled()) return;

    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    const memory = this.getMemoryService();

    for (const tenant of tenants) {
      try {
        const shouldRun = await memory.strategicReflection.shouldRunStrategicReflection(tenant.id);
        if (!shouldRun) continue;

        const activeGoals = await this.loadActiveGoals(tenant.id);

        const result = await memory.strategicReflection.reflectAndStore({
          tenantId: tenant.id,
          activeGoals,
        });

        logger.info('strategic_reflection_tenant', {
          tenantId: tenant.id,
          stored: Boolean(result),
          activeGoalCount: activeGoals.length,
          adaptations: result?.reflection.strategyAdaptations.length ?? 0,
        });
      } catch (err) {
        logger.warn('strategic_reflection_tenant_failed', {
          tenantId: tenant.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  private async loadActiveGoals(tenantId: string): Promise<ActiveGoalSnapshot[]> {
    try {
      const { goalRepository } = getCompositionRoot();
      const goals = await goalRepository.listActiveForProgress(tenantId);
      return goals.map(toActiveGoalSnapshot);
    } catch (err) {
      logger.warn('strategic_reflection_goals_load_failed', {
        tenantId,
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }
}

function toActiveGoalSnapshot(goal: MerchantGoalRecord): ActiveGoalSnapshot {
  return {
    id: goal.id,
    title: goal.title,
    progressPct: goal.progressPct,
    targetValue: goal.targetValue,
    status: goal.status,
    metricType: goal.metricType,
  };
}

export function createStrategicReflectionJob(
  getMemoryService: () => PersonalBrainMemoryService
): StrategicReflectionJob {
  return new StrategicReflectionJob(getMemoryService);
}
