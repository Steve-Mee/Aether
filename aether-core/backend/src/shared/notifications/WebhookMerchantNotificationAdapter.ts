import axios from 'axios';
import { logger } from '../logging/logger';
import type { MerchantNotificationPort } from './MerchantNotificationPort';

export class WebhookMerchantNotificationAdapter implements MerchantNotificationPort {
  private url = process.env.MERCHANT_WEBHOOK_URL;

  async notifyApprovalRequired(params: {
    tenantId: string;
    approvalId: string;
    module: string;
  }): Promise<void> {
    if (!this.url || process.env.MERCHANT_NOTIFICATIONS_ENABLED !== 'true') {
      logger.info('merchant_approval_notification_skipped', {
        reason: 'webhook disabled or MERCHANT_WEBHOOK_URL unset',
        ...params,
      });
      return;
    }

    try {
      await axios.post(
        this.url,
        {
          type: 'approval_required',
          tenantId: params.tenantId,
          approvalId: params.approvalId,
          module: params.module,
          timestamp: new Date().toISOString(),
        },
        { timeout: 5000 }
      );
      logger.info('merchant_approval_webhook_sent', params);
    } catch (error) {
      logger.warn('merchant_approval_webhook_failed', {
        ...params,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}
