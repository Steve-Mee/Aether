import { prisma } from '../../../../shared/prisma/client';
import type {
  ActivityFeedPort,
  AuditLogFilter,
  AuditLogRecord,
  CommandRecord,
} from '../../application/ports/ActivityFeedPort';

export class PrismaActivityFeedRepository implements ActivityFeedPort {
  findAuditLogs(filter: AuditLogFilter): Promise<AuditLogRecord[]> {
    return prisma.auditLog.findMany({
      where: {
        tenantId: filter.tenantId,
        createdAt: { gte: filter.since },
        ...(filter.module ? { module: filter.module } : {}),
        ...(filter.excludeNavigation ? { NOT: { action: 'ui.navigation' } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: filter.take,
    });
  }

  findCommands(tenantId: string, since: Date, take: number): Promise<CommandRecord[]> {
    return prisma.command.findMany({
      where: { tenantId, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
