import type { ProactiveTriggerDefinition } from '../ProactiveTriggerDefinition';
import { PROACTIVE_DEFAULT_COOLDOWN_MS, PROACTIVE_MARGIN_MIN_COUNT } from '../proactiveConfig';

export const marginDeclineTrigger: ProactiveTriggerDefinition = {
  id: 'pricing.margin_decline',
  agentKey: 'pricing',
  category: 'prijs',
  mode: 'periodic',
  defaultRiskLevel: 'low',
  cooldownMs: PROACTIVE_DEFAULT_COOLDOWN_MS,
  async evaluate(ctx) {
    const count = await ctx.adminData.countLowMarginProducts(ctx.tenantId);
    if (count < PROACTIVE_MARGIN_MIN_COUNT) return [];

    const riskLevel = count >= 10 ? 'medium' : 'low';
    return [
      {
        triggerId: 'pricing.margin_decline',
        dedupeKey: `pricing.margin_decline:${new Date().toISOString().slice(0, 10)}`,
        agentKey: 'pricing',
        title:
          count === 1
            ? '1 product met lage marge — optimaliseer prijzen'
            : `${count} producten met lage marge — optimaliseer prijzen`,
        summary: 'Pricing Agent signaleert structurele marge-druk.',
        command: 'Optimaliseer prijzen voor producten met lage marge',
        intentId: 'PRICING_OPTIMIZE',
        category: 'prijs',
        riskLevel,
        executionMode: riskLevel === 'medium' ? 'approval_required' : 'autonomous',
        priority: 7,
        evidence: { lowMarginCount: count },
      },
    ];
  },
};
