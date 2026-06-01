import { prisma } from '../prisma/client';
import { writeAuditLog } from '../audit/auditService';

const GATE_NAMES = ['security', 'data_integrity', 'quality', 'observability', 'truth_sync'] as const;

export type GateName = (typeof GATE_NAMES)[number];

export async function recordGateResult(
  tenantId: string,
  gate: GateName,
  passed: boolean,
  details?: Record<string, unknown>
): Promise<void> {
  await writeAuditLog({
    tenantId,
    module: 'release-gates',
    action: passed ? 'gate_pass' : 'gate_fail',
    actor: 'system',
    details: { gate, passed, ...details },
  });
}

export async function computeGatePassRate(tenantId: string, periodDays = 30): Promise<number> {
  const since = new Date(Date.now() - periodDays * 86400000);
  const audits = await prisma.auditLog.findMany({
    where: {
      tenantId,
      module: 'release-gates',
      action: { in: ['gate_pass', 'gate_fail'] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  if (audits.length === 0) return 1;
  const passes = audits.filter((a) => a.action === 'gate_pass').length;
  return passes / audits.length;
}

export { GATE_NAMES };
