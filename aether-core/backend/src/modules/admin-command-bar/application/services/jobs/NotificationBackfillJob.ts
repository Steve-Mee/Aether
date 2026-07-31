import type { TenantDirectoryPort } from '../../ports/TenantDirectoryPort';
import type { NotificationInboxService } from '../NotificationInboxService';
import { logger } from '../../../../../shared/logging/logger';
import { isNotificationMaterializeEnabled } from '../notifications/notificationConfig';

export class NotificationBackfillJob {
  constructor(
    private tenantDirectory: TenantDirectoryPort,
    private notificationInboxService: NotificationInboxService,
  ) {}

  async runAll(): Promise<void> {
    if (!isNotificationMaterializeEnabled()) return;
    const tenantIds = await this.tenantDirectory.listTenantIds();
    for (const tenantId of tenantIds) {
      try {
        const count = await this.notificationInboxService.syncVirtualNotificationsToStore(tenantId, 50);
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
