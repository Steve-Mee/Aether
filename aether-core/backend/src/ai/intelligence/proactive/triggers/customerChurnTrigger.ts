import type { ProactiveTriggerDefinition } from '../ProactiveTriggerDefinition';
import { PROACTIVE_DEFAULT_COOLDOWN_MS } from '../proactiveConfig';

const CHURN_AT_RISK_THRESHOLD = 3;

export const customerChurnTrigger: ProactiveTriggerDefinition = {
  id: 'customer.churn_risk',
  agentKey: 'customer',
  category: 'klanten',
  mode: 'periodic',
  defaultRiskLevel: 'low',
  cooldownMs: PROACTIVE_DEFAULT_COOLDOWN_MS,
  async evaluate(ctx) {
    const signals = await ctx.adminData.getChurnSignals(ctx.tenantId, 30);
    const churnDetected =
      signals.atRiskCount >= CHURN_AT_RISK_THRESHOLD ||
      (signals.decliningTrend && signals.trendPct < -15);

    if (!churnDetected) return [];

    return [
      {
        triggerId: 'customer.churn_risk',
        dedupeKey: `customer.churn_risk:${new Date().toISOString().slice(0, 10)}`,
        agentKey: 'customer',
        title:
          signals.atRiskCount >= CHURN_AT_RISK_THRESHOLD
            ? `${signals.atRiskCount} klanten at-risk — retentie-actie?`
            : 'Dalende order trend — churn-risico signalen',
        summary: 'Customer Insights Agent detecteerde churn-risico of dalende vraag.',
        command: 'Analyseer churn signalen en stel retentie- of prijsacties voor',
        intentId: 'CUSTOMER_CHURN_SIGNALS',
        category: 'klanten',
        riskLevel: 'low',
        executionMode: 'autonomous',
        priority: 7,
        evidence: {
          atRiskCount: signals.atRiskCount,
          trendPct: signals.trendPct,
          decliningTrend: signals.decliningTrend,
          cancelledOrRefundedRatio: signals.cancelledOrRefundedRatio,
          atRiskCustomers: signals.atRiskCustomers.slice(0, 5),
        },
      },
    ];
  },
};
