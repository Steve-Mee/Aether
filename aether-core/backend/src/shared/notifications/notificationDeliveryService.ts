import type { MerchantNotification } from '../../modules/admin-command-bar/application/services/notifications/notificationTypes';
import { overviewNotificationDispatcher } from '../../modules/admin-command-bar/application/services/OverviewNotificationDispatcher';
import { webPushNotificationDispatcher } from './WebPushNotificationDispatcher';

export interface NotificationDeliveryPort {
  deliverEmailForFeedEvent(
    tenantId: string,
    feedEventId: string,
    item: import('../../modules/admin-command-bar/application/services/OverviewFeedService').OverviewFeedItem,
  ): Promise<void>;
  deliverPush(tenantId: string, actorId: string | undefined, notification: MerchantNotification): Promise<void>;
}

class NotificationDeliveryServiceImpl implements NotificationDeliveryPort {
  async deliverEmailForFeedEvent(
    tenantId: string,
    feedEventId: string,
    item: import('../../modules/admin-command-bar/application/services/OverviewFeedService').OverviewFeedItem,
  ): Promise<void> {
    await overviewNotificationDispatcher.onFeedEventCreated(tenantId, feedEventId, item);
  }

  async deliverPush(
    tenantId: string,
    actorId: string | undefined,
    notification: MerchantNotification,
  ): Promise<void> {
    await webPushNotificationDispatcher.deliver(tenantId, actorId, notification);
  }
}

export const notificationDeliveryService = new NotificationDeliveryServiceImpl();
