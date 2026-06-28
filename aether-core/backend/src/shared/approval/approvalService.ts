import { prisma } from '../prisma/client';
import { eventBus } from '../events/eventBus';
import { writeAuditLog } from '../audit/auditService';
import { executeApprovedAction } from './approvalExecutor';
import { notifyOverviewApproval } from '../../modules/admin-command-bar/application/services/OverviewFeedNotify';

export async function createApproval(params: {
  tenantId: string;
  module: string;
  actionType: string;
  payload: Record<string, unknown>;
  requestedBy?: string;
}): Promise<{ id: string; status: string }> {
  const approval = await prisma.approval.create({
    data: {
      tenantId: params.tenantId,
      module: params.module,
      actionType: params.actionType,
      payload: JSON.stringify(params.payload),
      requestedBy: params.requestedBy,
      status: 'pending',
    },
  });

  await eventBus.publish({
    tenantId: params.tenantId,
    type: 'mail.approval_required',
    payload: { approvalId: approval.id, module: params.module, ...params.payload },
  });

  notifyOverviewApproval(params.tenantId, 'created', approval);

  return { id: approval.id, status: approval.status };
}

export async function resolveApproval(params: {
  id: string;
  tenantId: string;
  approve: boolean;
  resolvedBy: string;
}): Promise<void> {
  const approval = await prisma.approval.findFirst({
    where: { id: params.id, tenantId: params.tenantId, status: 'pending' },
  });
  if (!approval) return;

  await prisma.approval.update({
    where: { id: approval.id },
    data: {
      status: params.approve ? 'approved' : 'rejected',
      resolvedBy: params.resolvedBy,
      resolvedAt: new Date(),
    },
  });

  await writeAuditLog({
    tenantId: params.tenantId,
    module: 'approval',
    action: params.approve ? 'approved' : 'rejected',
    actor: params.resolvedBy,
    details: { approvalId: params.id },
  });

  notifyOverviewApproval(params.tenantId, 'updated', {
    ...approval,
    status: params.approve ? 'approved' : 'rejected',
    resolvedAt: new Date(),
  });

  if (params.approve) {
    const payload = JSON.parse(approval.payload) as Record<string, unknown>;
    await executeApprovedAction({
      tenantId: params.tenantId,
      approvalId: approval.id,
      module: approval.module,
      actionType: approval.actionType,
      payload,
      resolvedBy: params.resolvedBy,
    });
  }
}

export async function countPendingApprovals(tenantId: string): Promise<number> {
  return prisma.approval.count({ where: { tenantId, status: 'pending' } });
}
