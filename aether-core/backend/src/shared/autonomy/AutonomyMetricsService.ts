import { prisma } from '../prisma/client';

export interface AutonomyMetrics {
  totalDecisions: number;
  autonomousDecisions: number;
  humanGatedDecisions: number;
  autonomyRate: number;
  targetMet: boolean;
  byModule: Record<string, { total: number; autonomous: number; rate: number }>;
}

export async function getAutonomyMetrics(tenantId: string, periodDays = 30): Promise<AutonomyMetrics> {
  const since = new Date(Date.now() - periodDays * 86400000);

  const [decisions, approvals, commands] = await Promise.all([
    prisma.decision.findMany({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.approval.findMany({ where: { tenantId, createdAt: { gte: since } } }),
    prisma.command.findMany({ where: { tenantId, createdAt: { gte: since } } }),
  ]);

  const humanGated = approvals.filter((a) => a.status === 'pending' || a.status === 'approved').length;
  const autonomousDecisions = decisions.length + commands.length;
  const totalDecisions = autonomousDecisions + humanGated;
  const autonomyRate = totalDecisions === 0 ? 0 : autonomousDecisions / totalDecisions;

  const byModule: AutonomyMetrics['byModule'] = {};
  for (const d of decisions) {
    const mod = d.type.split('.')[0] ?? 'autonomous';
    if (!byModule[mod]) byModule[mod] = { total: 0, autonomous: 0, rate: 0 };
    byModule[mod].total += 1;
    byModule[mod].autonomous += 1;
  }
  for (const key of Object.keys(byModule)) {
    byModule[key].rate = byModule[key].total === 0 ? 0 : byModule[key].autonomous / byModule[key].total;
  }

  return {
    totalDecisions,
    autonomousDecisions,
    humanGatedDecisions: humanGated,
    autonomyRate,
    targetMet: autonomyRate >= 0.7,
    byModule,
  };
}
