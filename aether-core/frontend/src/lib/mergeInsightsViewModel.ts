import { env } from '@/lib/config';
import type { DashboardSummary } from './api';
import {
  periodToDays,
  type InsightsAutonomyBullet,
  type InsightsBreakdownRow,
  type InsightsDemoSnapshot,
  type InsightsPeriod,
  type InsightsRecentAction,
} from './insightsPageTypes';
import { formatCurrency } from './i18n';
import type {
  AutonomyMetricsResponse,
  InsightsMetricSources,
  InsightsViewModel,
  MetricSource,
  OutcomeRecord,
  OutcomeReport,
} from '@/types/insight';

export type {
  OutcomeRecord,
  OutcomeReport,
  AutonomyMetricsResponse,
  InsightsMetricSources,
  InsightsMetricView,
  InsightsViewModel,
  MetricTrend,
  MetricSource,
} from '@/types/insight';

export interface MergeInsightsInput {
  period: InsightsPeriod;
  dashboard: DashboardSummary | null;
  outcomes: OutcomeReport | null;
  autonomy: AutonomyMetricsResponse | null;
  lastCommandAt?: string | null;
  demo: InsightsDemoSnapshot;
}

function avgUpliftPercent(records: OutcomeRecord[]): number | null {
  const withUplift = records.filter((r) => r.baseline > 0 && r.uplift > 0);
  if (withUplift.length === 0) return null;
  const sum = withUplift.reduce((acc, r) => acc + (r.uplift / r.baseline) * 100, 0);
  return Math.round((sum / withUplift.length) * 10) / 10;
}

function breakdownFromOutcomes(records: OutcomeRecord[]): InsightsBreakdownRow[] | null {
  if (records.length === 0) return null;
  const byMetric = new Map<string, number>();
  for (const r of records) {
    const key = r.metric || 'Overig';
    byMetric.set(key, (byMetric.get(key) ?? 0) + Math.max(0, r.uplift));
  }
  const sorted = [...byMetric.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const total = sorted.reduce((s, [, v]) => s + v, 0) || 1;
  return sorted.map(([name, uplift]) => ({
    name,
    value: formatCurrency(uplift),
    share: Math.round((uplift / total) * 100),
  }));
}

function lowRiskForPeriod(
  dashboard: DashboardSummary | null,
  periodDays: number,
  demo: InsightsDemoSnapshot,
): { count: number; source: MetricSource } {
  const weekAuto = dashboard?.autonomousActions7d ?? 0;
  if (weekAuto > 0) {
    const liveCount = Math.round(weekAuto * (periodDays / 7) * 0.6);
    return {
      count: env.hybridDemo ? Math.max(demo.lowRiskAutonomous, liveCount) : liveCount,
      source: 'live',
    };
  }
  const daily = dashboard?.lowRiskAutonomous24h ?? 0;
  if (daily > 0) {
    const liveCount = Math.round(daily * Math.min(periodDays, 14));
    return {
      count: env.hybridDemo ? Math.max(demo.lowRiskAutonomous, liveCount) : liveCount,
      source: 'live',
    };
  }
  return {
    count: env.hybridDemo ? demo.lowRiskAutonomous : 0,
    source: env.hybridDemo ? 'demo' : 'live',
  };
}

function timeSavedHours(
  dashboard: DashboardSummary | null,
  periodDays: number,
  demo: InsightsDemoSnapshot,
): { hours: number; source: MetricSource } {
  const minutes7d = dashboard?.timeSavedMinutes7d ?? 0;
  if (minutes7d > 0) {
    const hours7d = minutes7d / 60;
    if (periodDays === 7) {
      return { hours: Math.round(hours7d * 10) / 10, source: 'live' };
    }
    if (periodDays === 30) {
      return { hours: Math.round(hours7d * (30 / 7) * 10) / 10, source: 'live' };
    }
    if (periodDays === 90) {
      return { hours: Math.round(hours7d * (90 / 7) * 10) / 10, source: 'live' };
    }
  }
  return {
    hours: env.hybridDemo ? demo.timeSavedHours : 0,
    source: env.hybridDemo ? 'demo' : 'live',
  };
}

export function mergeInsightsViewModel(input: MergeInsightsInput): InsightsViewModel {
  const { period, dashboard, outcomes, autonomy, lastCommandAt, demo } = input;
  const periodDays = periodToDays(period);
  const useDemoFallback = env.hybridDemo;

  const sources: InsightsMetricSources = {
    revenue: 'demo',
    timeSaved: 'demo',
    autonomousActions: 'demo',
    marginImprovement: 'demo',
    lowRiskAutonomous: 'demo',
    highRiskWithApproval: 'demo',
    topCategories: 'demo',
    topSuppliers: 'demo',
    peakAutonomy: 'demo',
    autonomyBullets: 'demo',
    recentActions: 'demo',
  };

  const upliftFromOutcomes = outcomes?.totalBillableUplift ?? 0;
  const upliftFromDashboard =
    periodDays === 30 && dashboard?.revenueUplift30d ? dashboard.revenueUplift30d : 0;
  const revenueAmount =
    upliftFromOutcomes > 0
      ? upliftFromOutcomes
      : upliftFromDashboard > 0
        ? upliftFromDashboard
        : useDemoFallback
          ? demo.revenueUpliftAmount
          : 0;

  if (upliftFromOutcomes > 0 || upliftFromDashboard > 0) {
    sources.revenue = 'live';
  }

  const upliftPctFromRecords = outcomes?.records?.length
    ? avgUpliftPercent(outcomes.records)
    : null;
  const revenuePercent = upliftPctFromRecords ?? (useDemoFallback ? demo.revenueUpliftPercent : 0);

  let autonomousCount = useDemoFallback ? demo.autonomousActions : 0;
  if (autonomy?.autonomousDecisions && autonomy.autonomousDecisions > 0) {
    autonomousCount = autonomy.autonomousDecisions;
    sources.autonomousActions = 'live';
  } else if (
    dashboard?.autonomousActions7d &&
    periodDays === 7 &&
    dashboard.autonomousActions7d > 0
  ) {
    autonomousCount = dashboard.autonomousActions7d;
    sources.autonomousActions = 'live';
  }

  let humanGated = useDemoFallback ? demo.highRiskWithApproval : 0;
  if (autonomy?.humanGatedDecisions && autonomy.humanGatedDecisions > 0) {
    humanGated = autonomy.humanGatedDecisions;
    sources.highRiskWithApproval = 'live';
  }

  let marginPct = useDemoFallback ? demo.marginImprovementPct : 0;
  if (upliftPctFromRecords != null) {
    marginPct = upliftPctFromRecords;
    sources.marginImprovement = 'live';
  }

  const lowRiskResult = lowRiskForPeriod(dashboard, periodDays, demo);
  sources.lowRiskAutonomous = lowRiskResult.source;

  const timeSavedResult = timeSavedHours(dashboard, periodDays, demo);
  sources.timeSaved = timeSavedResult.source;

  const categoriesFromOutcomes = outcomes?.records?.length
    ? breakdownFromOutcomes(outcomes.records)
    : null;
  if (outcomes != null) {
    sources.topCategories = 'live';
  }

  let autonomyBullets: InsightsAutonomyBullet[] = useDemoFallback ? demo.autonomyBullets : [];
  if (autonomy != null) {
    sources.autonomyBullets = 'live';
    if (autonomy.totalDecisions === 0) {
      autonomyBullets = [];
    }
  }

  let recentActions: InsightsRecentAction[] = useDemoFallback ? demo.recentActions : [];
  if (autonomy != null && outcomes != null && autonomy.totalDecisions === 0) {
    sources.recentActions = 'live';
    recentActions = [];
  }
  if (lastCommandAt) {
    const cmdAge = Date.now() - new Date(lastCommandAt).getTime();
    if (cmdAge < 24 * 60 * 60 * 1000) {
      recentActions = [
        {
          time: new Date(lastCommandAt).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
          }),
          descriptionKey: 'insights.recent.command',
          moduleKey: 'insights.module.command',
        },
        ...recentActions,
      ].slice(0, 6);
      sources.recentActions = 'live';
    }
  }

  const topCategories =
    categoriesFromOutcomes ?? (outcomes != null ? [] : useDemoFallback ? demo.topCategories : []);

  return {
    period,
    periodDays,
    sources,
    revenueUplift: {
      amount: revenueAmount,
      percent: revenuePercent,
      value: formatCurrency(revenueAmount),
      context: '',
      trend: revenueAmount > 0 ? 'up' : 'neutral',
    },
    timeSaved: {
      hours: timeSavedResult.hours,
      value: String(timeSavedResult.hours),
      context: '',
      trend: timeSavedResult.hours > 0 ? 'up' : 'neutral',
    },
    autonomousActions: {
      count: autonomousCount,
      value: String(autonomousCount),
      context: '',
      trend: autonomousCount > 0 ? 'up' : 'neutral',
    },
    marginImprovement: {
      percent: marginPct,
      value: `+${marginPct}%`,
      context: '',
      trend: marginPct > 0 ? 'up' : 'neutral',
    },
    lowRiskAutonomous: {
      count: lowRiskResult.count,
      value: String(lowRiskResult.count),
      context: '',
      trend: lowRiskResult.count > 0 ? 'up' : 'neutral',
    },
    highRiskWithApproval: {
      count: humanGated,
      value: String(humanGated),
      context: '',
      trend: 'neutral',
    },
    topCategories,
    topSuppliers: useDemoFallback ? demo.topSuppliers : [],
    peakAutonomy: useDemoFallback ? demo.peakAutonomy : [],
    autonomyBullets,
    recentActions,
  };
}
