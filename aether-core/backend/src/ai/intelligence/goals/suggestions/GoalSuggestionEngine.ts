import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { validateCreateGoalInput } from '../goalValidation';
import type { GoalMetricType } from '../types';
import { GOAL_METRIC_DEFAULTS } from '../types';
import type { GoalSuggestionInput } from './types';
import type { GoalSuggestionRepository } from './GoalSuggestionRepository';

const HORIZON_DAYS = 90;

export class GoalSuggestionEngine {
  constructor(
    private adminData: AdminDataPort,
    private repository: GoalSuggestionRepository
  ) {}

  async scanTenant(tenantId: string): Promise<number> {
    const candidates = await this.buildCandidates(tenantId);
    let stored = 0;
    for (const candidate of candidates) {
      try {
        validateCreateGoalInput({
          title: candidate.title,
          metricType: candidate.metricType,
          metricScope: candidate.metricScope as import('../types').GoalMetricScope,
          targetValue: candidate.suggestedTarget,
          baselineValue: candidate.suggestedBaseline,
          deadline: candidate.suggestedDeadline,
        });
      } catch {
        continue;
      }
      const row = await this.repository.upsertPending(tenantId, candidate);
      if (row) stored += 1;
    }
    return stored;
  }

  private async buildCandidates(tenantId: string): Promise<GoalSuggestionInput[]> {
    const out: GoalSuggestionInput[] = [];
    const deadline = new Date(Date.now() + HORIZON_DAYS * 86_400_000);

    const margin = await this.adminData.getMarginMetrics(tenantId);
    if (margin.marginPct < 15 && margin.lowMarginCount >= 3) {
      const baseline = margin.marginPct;
      const target = Math.min(baseline * 1.15, baseline + 5);
      out.push(this.candidate('margin', {
        dedupeKey: `ai.margin:${Math.round(baseline)}`,
        title: `Verhoog marge naar ${Math.round(target)}%`,
        baseline,
        target,
        deadline,
        confidence: 0.72,
        rationale: 'Structureel lage marge gedetecteerd over meerdere producten.',
        evidence: { marginPct: baseline, lowMarginCount: margin.lowMarginCount },
      }));
    }

    const trends = await this.adminData.getOrderTrends(tenantId, 30);
    if (trends.trendPct <= -10) {
      const baseline = trends.recentCount;
      const target = Math.round(baseline * 1.2);
      out.push(this.candidate('revenue', {
        dedupeKey: `ai.revenue:${trends.trendPct}`,
        title: 'Herstel ordervolume',
        baseline,
        target,
        deadline,
        confidence: 0.68,
        rationale: 'Ordervolume daalt ten opzichte van de vorige periode.',
        evidence: { trendPct: trends.trendPct, recentCount: trends.recentCount },
      }));
    }

    const inventory = await this.adminData.getInventoryCostSummary(tenantId);
    if (inventory.lowStockCount >= 5) {
      const baseline = inventory.lowStockCount;
      const target = Math.max(1, Math.round(baseline * 0.6));
      out.push(this.candidate('inventory', {
        dedupeKey: `ai.inventory:${baseline}`,
        title: 'Verlaag low-stock SKUs',
        baseline,
        target,
        deadline,
        confidence: 0.7,
        rationale: 'Veel SKU\'s onder voorraaddrempel.',
        evidence: { lowStockCount: inventory.lowStockCount },
      }));
    }

    return out;
  }

  private candidate(
    metricType: GoalMetricType,
    params: {
      dedupeKey: string;
      title: string;
      baseline: number;
      target: number;
      deadline: Date;
      confidence: number;
      rationale: string;
      evidence: Record<string, unknown>;
      metricScope?: Record<string, unknown>;
    }
  ): GoalSuggestionInput {
    const direction = GOAL_METRIC_DEFAULTS[metricType].direction;
    return {
      dedupeKey: params.dedupeKey,
      title: params.title,
      metricType,
      metricScope: params.metricScope,
      suggestedTarget: params.target,
      suggestedBaseline: params.baseline,
      suggestedDeadline: params.deadline,
      confidence: params.confidence,
      rationale: params.rationale,
      evidence: { ...params.evidence, direction },
    };
  }
}
