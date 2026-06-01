import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { EmailRollbackPort } from '../../application/ports/EmailRollbackPort';

export class PrismaEmailRollbackAdapter implements EmailRollbackPort {
  async findEmail(tenantId: string, emailId: string) {
    const tid = requireTenantId(tenantId, 'EmailRollback.findEmail');
    return prisma.emailMessage.findFirst({ where: { id: emailId, tenantId: tid } });
  }

  async resetEmail(emailId: string) {
    await prisma.emailMessage.update({
      where: { id: emailId },
      data: { status: 'received', draftReply: null, sentAt: null },
    });
  }

  async cancelApprovals(tenantId: string, emailId: string, actorId?: string) {
    const tid = requireTenantId(tenantId, 'EmailRollback.cancelApprovals');
    await prisma.approval.updateMany({
      where: {
        tenantId: tid,
        module: 'aether-mail',
        status: { in: ['pending', 'approved'] },
        payload: { contains: emailId },
      },
      data: { status: 'cancelled', resolvedAt: new Date(), resolvedBy: actorId ?? 'rollback' },
    });
  }
}

export const emailRollbackAdapter = new PrismaEmailRollbackAdapter();
