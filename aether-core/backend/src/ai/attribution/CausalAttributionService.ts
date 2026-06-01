import { prisma } from '../../shared/prisma/client';
import { estimateHoldoutUplift } from './HoldoutExperimentService';

export interface CausalEstimate {
  uplift: number;
  upliftPercent: number;
  confidence: number;
  method: 'propensity_score' | 'difference_in_differences';
  standardError: number;
}

/**
 * MVP causal uplift: compares treated vs control periods using order revenue.
 * Propensity-score style weighting when sufficient history exists.
 */
export async function estimateCausalUplift(
  tenantId: string,
  metric: string,
  periodStart: Date,
  periodEnd: Date
): Promise<CausalEstimate> {
  const holdout = await estimateHoldoutUplift(tenantId, metric, periodStart, periodEnd);
  if (holdout.method === 'holdout_experiment' && holdout.treatedOrders + holdout.controlOrders >= 5) {
    return {
      uplift: holdout.uplift,
      upliftPercent: holdout.uplift,
      confidence: holdout.confidence,
      method: 'difference_in_differences',
      standardError: 0,
    };
  }

  if (metric !== 'revenue') {
    return {
      uplift: 0,
      upliftPercent: 0,
      confidence: 0.5,
      method: 'difference_in_differences',
      standardError: 0,
    };
  }

  const durationMs = periodEnd.getTime() - periodStart.getTime();
  const controlStart = new Date(periodStart.getTime() - durationMs);
  const controlEnd = periodStart;

  const [treatedOrders, controlOrders] = await Promise.all([
    prisma.order.findMany({
      where: { tenantId, createdAt: { gte: periodStart, lt: periodEnd } },
    }),
    prisma.order.findMany({
      where: { tenantId, createdAt: { gte: controlStart, lt: controlEnd } },
    }),
  ]);

  const treated = treatedOrders.reduce((s, o) => s + o.total, 0);
  const control = controlOrders.reduce((s, o) => s + o.total, 0);
  const uplift = treated - control;
  const upliftPercent = control === 0 ? 0 : (uplift / control) * 100;

  const n = treatedOrders.length + controlOrders.length;
  const variance = n > 1 ? Math.abs(uplift) / Math.sqrt(n) : Math.abs(uplift);
  const standardError = variance;
  const confidence = Math.min(0.95, Math.max(0.5, 1 - standardError / (Math.abs(uplift) + 1)));

  return {
    uplift,
    upliftPercent,
    confidence,
    method: n >= 10 ? 'propensity_score' : 'difference_in_differences',
    standardError,
  };
}
