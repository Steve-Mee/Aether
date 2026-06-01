export interface ApprovalExecutionContext {
  tenantId: string;
  approvalId: string;
  module: string;
  actionType: string;
  payload: Record<string, unknown>;
  resolvedBy: string;
}

export interface ApprovalActionHandler {
  canHandle(module: string, actionType: string): boolean;
  execute(ctx: ApprovalExecutionContext): Promise<void>;
}
