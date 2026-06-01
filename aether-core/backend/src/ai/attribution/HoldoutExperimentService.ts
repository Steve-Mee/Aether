import { prisma } from '../../shared/prisma/client';

export interface HoldoutEstimate {
  uplift: number;
  confidence: number;
  method: 'holdout_experiment' | 'difference_in_differences';
  treatedOrders: number;
  controlOrders: number;
}

/**
 * Causal Outcome Engine v2 — holdout-based uplift estimation (MVP).
 */
export async function estimateHoldoutUplift(
  tenantId: string,
  metric: string,
  periodStart: Date,
  periodEnd: Date
): Promise<HoldoutEstimate> {
  const assignment = await prisma.experimentAssignment.findFirst({
    where: { tenantId, metric, active: true },
  });

  if (!assignment) {
    return {
      uplift: 0,
      confidence: 0.4,
      method: 'difference_in_differences',
      treatedOrders: 0,
      controlOrders: 0,
    };
  }

  const [treatedOrders, controlOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: periodStart, lt: periodEnd },
        customerId: { in: JSON.parse(assignment.treatedIds) as string[] },
      },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: periodStart, lt: periodEnd },
        customerId: { in: JSON.parse(assignment.controlIds) as string[] },
      },
    }),
  ]);

  const treatedRevenue = treatedOrders.reduce((s, o) => s + o.total, 0);
  const controlRevenue = controlOrders.reduce((s, o) => s + o.total, 0);
  const treatedAvg = treatedOrders.length === 0 ? 0 : treatedRevenue / treatedOrders.length;
  const controlAvg = controlOrders.length === 0 ? 0 : controlRevenue / controlOrders.length;
  const uplift = controlAvg === 0 ? 0 : ((treatedAvg - controlAvg) / controlAvg) * 100;

  const sampleSize = treatedOrders.length + controlOrders.length;
  const confidence = Math.min(0.95, 0.5 + sampleSize / 200);

  return {
    uplift,
    confidence,
    method: 'holdout_experiment',
    treatedOrders: treatedOrders.length,
    controlOrders: controlOrders.length,
  };
}
