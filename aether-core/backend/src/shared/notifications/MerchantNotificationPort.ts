export interface MerchantNotificationPort {
  notifyApprovalRequired(params: {
    tenantId: string;
    approvalId: string;
    module: string;
  }): Promise<void>;
}
