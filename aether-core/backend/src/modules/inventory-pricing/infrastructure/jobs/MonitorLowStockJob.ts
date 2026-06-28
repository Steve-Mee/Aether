import { prisma } from '../../../../shared/prisma/client';
import { logger } from '../../../../shared/logging/logger';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { withServerSpan } from '../../../../shared/observability/sentry';

export class MonitorLowStockJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (process.env.INVENTORY_LOW_STOCK_MONITOR_ENABLED !== 'true') {
      logger.info('inventory_low_stock_monitor_disabled');
      return;
    }
    const intervalMs = parseInt(process.env.INVENTORY_LOW_STOCK_MONITOR_INTERVAL_MS ?? '3600000', 10);
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    logger.info('inventory_low_stock_monitor_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runAll(): Promise<void> {
    const { monitorLowStockUseCase } = getCompositionRoot();
    const tenants = await prisma.tenant.findMany({ select: { id: true } });
    for (const tenant of tenants) {
      try {
        await withServerSpan(
          'inventory.low_stock_monitor',
          { tenantId: tenant.id },
          () =>
            monitorLowStockUseCase.execute({
              tenantId: tenant.id,
              actorId: 'scheduler',
            })
        );
      } catch (error) {
        logger.warn('inventory_low_stock_monitor_failed', {
          tenantId: tenant.id,
          error: String(error),
        });
      }
    }
  }
}

export const monitorLowStockJob = new MonitorLowStockJob();
