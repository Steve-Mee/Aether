import { prisma } from '../../../../shared/prisma/client';
import type { UiAdoptionMetricsPort } from '../../application/ports/UiAdoptionMetricsPort';

export class PrismaUiAdoptionMetricsRepository implements UiAdoptionMetricsPort {
  getCommandIntentsSince(tenantId: string, since: Date) {
    return prisma.command.findMany({
      where: { tenantId, createdAt: { gte: since } },
      select: { intent: true },
    });
  }

  countNavEventsSince(tenantId: string, since: Date) {
    return prisma.auditLog.count({
      where: {
        tenantId,
        module: 'admin-command-bar',
        action: 'ui.navigation',
        createdAt: { gte: since },
      },
    });
  }

  countAutonomyAuditsSince(tenantId: string, since: Date) {
    return prisma.auditLog.count({
      where: {
        tenantId,
        action: { startsWith: 'autonomy_' },
        createdAt: { gte: since },
      },
    });
  }

  countPolicyAutoApprovalsSince(tenantId: string, since: Date) {
    return prisma.approval.count({
      where: {
        tenantId,
        status: 'approved',
        resolvedBy: 'policy-auto',
        resolvedAt: { gte: since },
      },
    });
  }

  countAutonomyExecuteSince(tenantId: string, since: Date) {
    return prisma.auditLog.count({
      where: {
        tenantId,
        action: 'autonomy_execute',
        createdAt: { gte: since },
      },
    });
  }
}
