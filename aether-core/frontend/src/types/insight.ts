/**
 * Insights / outcomes / autonomy metric types.
 * @see GET /api/outcomes/report, GET /api/admin/autonomy
 */

import type {
  InsightsAutonomyBullet,
  InsightsBreakdownRow,
  InsightsPeriod,
  InsightsRecentAction,
} from '@/lib/insightsPageTypes';

export type { InsightsPeriod };

/** Single outcome attribution record from the outcomes module. */
export interface OutcomeRecord {
  id: string;
  metric: string;
  baseline: number;
  observed: number;
  uplift: number;
  confidence: number;
  verificationStatus: string;
  periodStart: string;
  periodEnd: string;
}

/** Aggregated outcome report for a period. */
export interface OutcomeReport {
  periodDays: number;
  totalRecords: number;
  verifiedCount: number;
  billableCount: number;
  totalBillableUplift: number;
  records: OutcomeRecord[];
}

/** Autonomy metrics from the admin module. */
export interface AutonomyMetrics {
  totalDecisions: number;
  autonomousDecisions: number;
  humanGatedDecisions: number;
  autonomyRate: number;
  targetMet: boolean;
}

/** API response wrapper (may include partial status). */
export interface AutonomyMetricsResponse extends AutonomyMetrics {
  status?: 'partial' | 'live';
}

export type MetricTrend = 'up' | 'down' | 'neutral';

export type { InsightsAutonomyBullet, InsightsBreakdownRow, InsightsRecentAction };

/** Whether a displayed metric value came from API or demo padding. */
export type MetricSource = 'live' | 'demo';

/** A single KPI shown on the Insights page. */
export interface InsightMetric {
  key: string;
  value: string;
  context: string;
  trend: MetricTrend;
  source: MetricSource;
}

export interface InsightsMetricSources {
  revenue: MetricSource;
  timeSaved: MetricSource;
  autonomousActions: MetricSource;
  marginImprovement: MetricSource;
  lowRiskAutonomous: MetricSource;
  highRiskWithApproval: MetricSource;
  topCategories: MetricSource;
  topSuppliers: MetricSource;
  peakAutonomy: MetricSource;
  autonomyBullets: MetricSource;
  recentActions: MetricSource;
}

export interface InsightsMetricView {
  value: string;
  context: string;
  trend: MetricTrend;
}

/** Merged insights page view model (live + demo sources). */
export interface InsightsViewModel {
  period: InsightsPeriod;
  periodDays: number;
  sources: InsightsMetricSources;
  revenueUplift: InsightsMetricView & { amount: number; percent: number };
  timeSaved: InsightsMetricView & { hours: number };
  autonomousActions: InsightsMetricView & { count: number };
  marginImprovement: InsightsMetricView & { percent: number };
  lowRiskAutonomous: InsightsMetricView & { count: number };
  highRiskWithApproval: InsightsMetricView & { count: number };
  topCategories: InsightsBreakdownRow[];
  topSuppliers: InsightsBreakdownRow[];
  peakAutonomy: InsightsBreakdownRow[];
  autonomyBullets: InsightsAutonomyBullet[];
  recentActions: InsightsRecentAction[];
}
