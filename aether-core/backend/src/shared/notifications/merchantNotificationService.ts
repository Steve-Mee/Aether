import { LogMerchantNotificationAdapter } from './LogMerchantNotificationAdapter';
import { WebhookMerchantNotificationAdapter } from './WebhookMerchantNotificationAdapter';
import type { MerchantNotificationPort } from './MerchantNotificationPort';

function createNotificationService(): MerchantNotificationPort {
  if (process.env.MERCHANT_NOTIFICATIONS_ENABLED === 'true' && process.env.MERCHANT_WEBHOOK_URL) {
    return new WebhookMerchantNotificationAdapter();
  }
  return new LogMerchantNotificationAdapter();
}

export const merchantNotificationService: MerchantNotificationPort = createNotificationService();
