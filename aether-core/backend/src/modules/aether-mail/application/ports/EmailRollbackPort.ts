export interface EmailRollbackPort {
  findEmail(tenantId: string, emailId: string): Promise<{ id: string } | null>;
  resetEmail(emailId: string): Promise<void>;
  cancelApprovals(tenantId: string, emailId: string, actorId?: string): Promise<void>;
}
