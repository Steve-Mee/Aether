import { prisma } from '../../../../shared/prisma/client';
import { logger } from '../../../../shared/logging/logger';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';

export class MonitorSupplierJob {
  private timer: NodeJS.Timeout | null = null;

  start(): void {
    if (process.env.SUPPLIER_MONITOR_ENABLED !== 'true') {
      logger.info('supplier_monitor_disabled');
      return;
    }
    const intervalMs = parseInt(process.env.SUPPLIER_MONITOR_INTERVAL_MS ?? '3600000', 10);
    void this.runAll();
    this.timer = setInterval(() => void this.runAll(), intervalMs);
    logger.info('supplier_monitor_started', { intervalMs });
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  async runAll(): Promise<void> {
    const { monitorSupplierUseCase } = getCompositionRoot();
    const suppliers = await prisma.supplier.findMany();
    for (const s of suppliers) {
      try {
        await monitorSupplierUseCase.execute(s.id, {
          tenantId: s.tenantId,
          actorId: 'scheduler',
        });
      } catch (error) {
        logger.warn('supplier_monitor_failed', { supplierId: s.id, error: String(error) });
      }
    }
  }
}

export const monitorSupplierJob = new MonitorSupplierJob();
