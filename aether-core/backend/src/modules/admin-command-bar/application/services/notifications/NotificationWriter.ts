import type { MerchantNotification } from './notificationTypes';
import type { NotificationPort } from '../../ports/NotificationPort';
import { NotificationGrouper } from './NotificationGrouper';
import { isNotificationMaterializeEnabled } from './notificationConfig';

export interface MaterializeInput {
  tenantId: string;
  notification: MerchantNotification;
  sourceType: string;
  sourceId?: string;
  skipGrouping?: boolean;
}

export class NotificationWriterService {
  constructor(
    private notificationPort: NotificationPort,
    private notificationGrouper: NotificationGrouper,
  ) {}

  async materializeNotification(input: MaterializeInput): Promise<MerchantNotification | null> {
    if (!isNotificationMaterializeEnabled()) return input.notification;

    const sourceId = input.sourceId ?? '';
    let notification = input.notification;

    if (!input.skipGrouping) {
      const grouped = await this.notificationGrouper.applyNotificationGrouping(
        input.tenantId,
        notification,
        input.sourceType,
        sourceId,
      );
      if (grouped.hideIndividual) {
        return grouped.notification;
      }
      notification = grouped.notification;
    }

    await this.notificationPort.upsertNotification({
      id: notification.id,
      tenantId: input.tenantId,
      kind: notification.kind,
      category: notification.category ?? 'general',
      title: notification.title,
      body: notification.body,
      severity: notification.severity,
      href: notification.href,
      actionLabel: notification.actionLabel,
      sourceType: input.sourceType,
      sourceId,
      groupKey: notification.groupKey,
      groupCount: notification.groupCount ?? 1,
      visible: true,
      createdAt: new Date(notification.createdAt),
    });

    return notification;
  }

  async materializeAndEmit(
    tenantId: string,
    notification: MerchantNotification,
    sourceType: string,
    sourceId?: string,
  ): Promise<MerchantNotification> {
    const result = await this.materializeNotification({
      tenantId,
      notification,
      sourceType,
      sourceId,
    });
    return result ?? notification;
  }
}
