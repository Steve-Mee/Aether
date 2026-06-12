export type InsightsPeriod = '7d' | '30d' | '90d' | 'custom';

export interface InsightsBreakdownRow {
  name: string;
  value: string;
  share: number;
  nameKey?: string;
  valueKey?: string;
  valueCount?: number;
}

export interface InsightsAutonomyBullet {
  labelKey: string;
  count: number;
}

export interface InsightsRecentAction {
  time: string;
  descriptionKey: string;
  moduleKey: string;
}

export interface InsightsDemoSnapshot {
  periodDays: number;
  revenueUpliftAmount: number;
  revenueUpliftPercent: number;
  timeSavedHours: number;
  autonomousActions: number;
  marginImprovementPct: number;
  lowRiskAutonomous: number;
  highRiskWithApproval: number;
  topCategories: InsightsBreakdownRow[];
  topSuppliers: InsightsBreakdownRow[];
  peakAutonomy: InsightsBreakdownRow[];
  autonomyBullets: InsightsAutonomyBullet[];
  recentActions: InsightsRecentAction[];
}

/** Zeroed snapshot for API-only mode when VITE_HYBRID_DEMO=false. */
export function emptyInsightsDemoSnapshot(period: InsightsPeriod): InsightsDemoSnapshot {
  return {
    periodDays: periodToDays(period),
    revenueUpliftAmount: 0,
    revenueUpliftPercent: 0,
    timeSavedHours: 0,
    autonomousActions: 0,
    marginImprovementPct: 0,
    lowRiskAutonomous: 0,
    highRiskWithApproval: 0,
    topCategories: [],
    topSuppliers: [],
    peakAutonomy: [],
    autonomyBullets: [],
    recentActions: [],
  };
}

export function periodToDays(period: InsightsPeriod): number {
  if (period === '7d') return 7;
  if (period === '90d') return 90;
  if (period === 'custom') return 30;
  return 30;
}
