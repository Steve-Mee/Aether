import { prisma } from '../../../../../shared/prisma/client';
import { requireTenantId } from '../../../../../shared/tenant/tenantContext';

export async function countEmailsByStatus(tenantId: string, statuses: string[]) {
  const tid = requireTenantId(tenantId, 'AdminData.countEmailsByStatus');
  return prisma.emailMessage.count({ where: { tenantId: tid, status: { in: statuses } } });
}

export async function countOutcomesByStatus(tenantId: string, status: string) {
  const tid = requireTenantId(tenantId, 'AdminData.countOutcomesByStatus');
  return prisma.outcomeRecord.count({
    where: { tenantId: tid, verificationStatus: status },
  });
}

export async function countPendingApprovals(tenantId: string) {
  const tid = requireTenantId(tenantId, 'AdminData.countPendingApprovals');
  return prisma.approval.count({ where: { tenantId: tid, status: 'pending' } });
}

export async function listPendingApprovals(tenantId: string, modules: string[]) {
  const tid = requireTenantId(tenantId, 'AdminData.listPendingApprovals');
  const rows = await prisma.approval.findMany({
    where: { tenantId: tid, status: 'pending', module: { in: modules } },
  });
  return rows.map((r) => ({ id: r.id, payload: r.payload, module: r.module }));
}

export async function approveLowRisk(tenantId: string, ids: string[], actorId?: string) {
  const tid = requireTenantId(tenantId, 'AdminData.approveLowRisk');
  const result = await prisma.approval.updateMany({
    where: { tenantId: tid, id: { in: ids } },
    data: { status: 'approved', resolvedAt: new Date(), resolvedBy: actorId },
  });
  return result.count;
}

export async function findLatestProposedOutcome(tenantId: string) {
  const tid = requireTenantId(tenantId, 'AdminData.findLatestProposedOutcome');
  return prisma.outcomeRecord.findFirst({
    where: { tenantId: tid, verificationStatus: 'proposed' },
    orderBy: { createdAt: 'desc' },
  });
}

export async function countRecentCommands(tenantId: string, daysSince = 7) {
  const tid = requireTenantId(tenantId, 'AdminData.countRecentCommands');
  const since = new Date(Date.now() - daysSince * 86400000);
  return prisma.command.count({ where: { tenantId: tid, createdAt: { gte: since } } });
}
