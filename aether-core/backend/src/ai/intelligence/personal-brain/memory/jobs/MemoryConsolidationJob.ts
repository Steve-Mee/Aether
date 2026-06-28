import { prisma } from '../../../../../shared/prisma/client';
import { logger } from '../../../../../shared/logging/logger';
import type { PersonalBrainMemoryService } from '../PersonalBrainMemoryService';

export class MemoryConsolidationJob {
  private timer: NodeJS.Timeout | null = null;

  constructor(private getMemoryService: () => PersonalBrainMemoryService) {}

  start(): void {
    if (process.env.MEMORY_CONSOLIDATION_JOB_ENABLED !== 'true') return;
    const intervalMs = parseInt(
      process.env.MEMORY_CONSOLIDATION_INTERVAL_MS ?? '604800000',
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
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    const memory = this.getMemoryService();
    for (const tenant of tenants) {
      try {
        const pruned = await memory.pruneLongTerm(tenant.id);
        const interactionPruned = await memory.pruneInteractionVectors(tenant.id);
        const consolidated = await memory.consolidateTenant(tenant.id);
        logger.info('memory_consolidation_tenant', {
          tenantId: tenant.id,
          pruned,
          interactionPruned,
          consolidated,
        });
      } catch (err) {
        logger.warn('memory_consolidation_tenant_failed', {
          tenantId: tenant.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

export function createMemoryConsolidationJob(
  getMemoryService: () => PersonalBrainMemoryService
): MemoryConsolidationJob {
  return new MemoryConsolidationJob(getMemoryService);
}
