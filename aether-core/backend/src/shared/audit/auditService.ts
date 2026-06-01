import { prisma } from '../prisma/client';

export async function writeAuditLog(params: {
  tenantId: string;
  module: string;
  action: string;
  actor?: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      module: params.module,
      action: params.action,
      actor: params.actor,
      details: params.details ? JSON.stringify(params.details) : null,
    },
  });
}
