import { writeAuditLog } from '../../../../shared/audit/auditService';
import type { EmailRollbackPort } from '../ports/EmailRollbackPort';

export class EmailRollbackService {
  constructor(private port: EmailRollbackPort) {}

  async rollback(emailId: string, tenantId: string, actorId?: string): Promise<void> {
    const email = await this.port.findEmail(tenantId, emailId);
    if (!email) throw new Error('Email not found');

    await this.port.resetEmail(emailId);
    await this.port.cancelApprovals(tenantId, emailId, actorId);

    await writeAuditLog({
      tenantId,
      module: 'aether-mail',
      action: 'email_rolled_back',
      actor: actorId,
      details: { emailId },
    });
  }
}
