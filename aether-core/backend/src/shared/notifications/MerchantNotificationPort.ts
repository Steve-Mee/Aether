export interface MerchantNotificationPort {
  notifyApprovalRequired(params: {
    tenantId: string;
    approvalId: string;
    module: string;
  }): Promise<void>;

  notifyHandoffCompleted?(params: {
    tenantId: string;
    jobId?: string;
    narrative?: string;
    success: boolean;
  }): Promise<void>;
}
