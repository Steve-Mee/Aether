import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { EmailAnalyticsPort } from '../../application/ports/EmailAnalyticsPort';

export class PrismaEmailAnalyticsAdapter implements EmailAnalyticsPort {
  async listEmailsSince(tenantId: string, since: Date) {
    const tid = requireTenantId(tenantId, 'EmailAnalytics.listEmails');
    return prisma.emailMessage.findMany({
      where: { tenantId: tid, createdAt: { gte: since } },
    });
  }

  async listProcessedAuditLogsSince(tenantId: string, since: Date) {
    const tid = requireTenantId(tenantId, 'EmailAnalytics.listAuditLogs');
    return prisma.auditLog.findMany({
      where: {
        tenantId: tid,
        module: 'aether-mail',
        action: 'email_processed',
        createdAt: { gte: since },
      },
    });
  }

  async countRollbackAuditLogsSince(tenantId: string, since: Date) {
    const tid = requireTenantId(tenantId, 'EmailAnalytics.countRollbacks');
    return prisma.auditLog.count({
      where: {
        tenantId: tid,
        module: 'aether-mail',
        action: 'email_rolled_back',
        createdAt: { gte: since },
      },
    });
  }
}

export const emailAnalyticsAdapter = new PrismaEmailAnalyticsAdapter();
