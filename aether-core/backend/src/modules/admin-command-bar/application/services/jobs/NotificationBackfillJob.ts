import { prisma } from '../../../../../shared/prisma/client';
import { syncVirtualNotificationsToStore } from '../NotificationInboxService';
import { logger } from '../../../../../shared/logging/logger';
import { isNotificationMaterializeEnabled } from '../notifications/notificationConfig';

export class NotificationBackfillJob {
  async runAll(): Promise<void> {
    if (!isNotificationMaterializeEnabled()) return;
    const tenants = await prisma.tenantSettings.findMany({ select: { tenantId: true } });
    for (const { tenantId } of tenants) {
      try {
        const count = await syncVirtualNotificationsToStore(tenantId, 50);
        if (count > 0) {
          logger.info('notification_backfill_done', { tenantId, count });
        }
      } catch (err) {
        logger.warn('notification_backfill_failed', {
          tenantId,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }
}

export const notificationBackfillJob = new NotificationBackfillJob();
