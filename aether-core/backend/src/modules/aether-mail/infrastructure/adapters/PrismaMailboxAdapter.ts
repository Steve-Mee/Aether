import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { MailboxPort } from '../../application/ports/MailboxPort';

export class PrismaMailboxAdapter implements MailboxPort {
  async listMailboxes(tenantId: string) {
    const tid = requireTenantId(tenantId, 'Mailbox.list');
    return prisma.mailbox.findMany({ where: { tenantId: tid } });
  }

  async createMailbox(
    tenantId: string,
    data: { email: string; imapHost?: string; smtpHost?: string; credentialsEnc?: string }
  ) {
    const tid = requireTenantId(tenantId, 'Mailbox.create');
    return prisma.mailbox.create({ data: { tenantId: tid, ...data } });
  }
}

export const mailboxAdapter = new PrismaMailboxAdapter();
