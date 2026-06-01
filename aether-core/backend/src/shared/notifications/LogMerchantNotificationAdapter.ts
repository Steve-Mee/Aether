import { logger } from '../logging/logger';
import type { MerchantNotificationPort } from './MerchantNotificationPort';

export class LogMerchantNotificationAdapter implements MerchantNotificationPort {
  async notifyApprovalRequired(params: {
    tenantId: string;
    approvalId: string;
    module: string;
  }): Promise<void> {
    logger.info('merchant_approval_notification', params);
  }
}
