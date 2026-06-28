import type { ProactiveTriggerDefinition } from '../ProactiveTriggerDefinition';
import { PROACTIVE_DEFAULT_COOLDOWN_MS, PROACTIVE_ORDER_ANOMALY_PCT } from '../proactiveConfig';

export const orderAnomalyTrigger: ProactiveTriggerDefinition = {
  id: 'general.order_anomaly',
  agentKey: 'workflow_supervisor',
  category: 'algemeen',
  mode: 'periodic',
  defaultRiskLevel: 'low',
  cooldownMs: PROACTIVE_DEFAULT_COOLDOWN_MS,
  async evaluate(ctx) {
    const trends = await ctx.adminData.getOrderTrends(ctx.tenantId, 30);
    const absPct = Math.abs(trends.trendPct);
    if (absPct < PROACTIVE_ORDER_ANOMALY_PCT) return [];

    const direction = trends.trendPct >= 0 ? 'stijging' : 'daling';
    return [
      {
        triggerId: 'general.order_anomaly',
        dedupeKey: `general.order_anomaly:${new Date().toISOString().slice(0, 10)}`,
        agentKey: 'workflow_supervisor',
        title: `Ordervolume afwijkend (${direction} ${absPct.toFixed(0)}%) — analyseer oorzaak`,
        summary: 'Ongebruikelijk orderpatroon gedetecteerd.',
        command: 'Hoe presteert mijn business deze week?',
        intentId: 'BUSINESS_SUMMARY',
        category: 'algemeen',
        riskLevel: 'low',
        executionMode: 'inform_only',
        priority: 6,
        evidence: {
          trendPct: trends.trendPct,
          recentCount: trends.recentCount,
          priorCount: trends.priorCount,
        },
      },
    ];
  },
};
