export type GoalMetricType = 'margin' | 'revenue' | 'inventory' | 'category_revenue';
export type GoalDirection = 'increase' | 'decrease';
export type GoalPursuitMode = 'conservative' | 'balanced' | 'aggressive';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type GoalUnit = 'percent' | 'count' | 'currency';
export type GoalProgressSource = 'periodic' | 'event' | 'manual';

export interface GoalMetricScope {
  categoryId?: string;
  threshold?: number;
  productSlug?: string;
}

export interface CreateGoalInput {
  title: string;
  description?: string;
  metricType: GoalMetricType;
  metricScope?: GoalMetricScope;
  targetValue: number;
  baselineValue?: number;
  unit?: GoalUnit;
  direction?: GoalDirection;
  deadline: string | Date;
  pursuitMode?: GoalPursuitMode;
  parentGoalId?: string;
}

export interface UpdateGoalInput {
  title?: string;
  description?: string | null;
  targetValue?: number;
  deadline?: string | Date;
  status?: GoalStatus;
  pursuitMode?: GoalPursuitMode;
}

export interface MerchantGoalRecord {
  id: string;
  tenantId: string;
  title: string;
  description: string | null;
  metricType: GoalMetricType;
  metricScope: GoalMetricScope;
  targetValue: number;
  baselineValue: number;
  currentValue: number | null;
  unit: GoalUnit;
  direction: GoalDirection;
  deadline: Date;
  status: GoalStatus;
  pursuitMode: GoalPursuitMode;
  parentGoalId: string | null;
  progressPct: number | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  outcomeRecordId?: string | null;
  verifiedUplift?: number | null;
  priorityWeight?: number | null;
  children?: MerchantGoalRecord[];
}

export interface GoalProgressSnapshotRecord {
  id: string;
  goalId: string;
  tenantId: string;
  value: number;
  progressPct: number;
  recordedAt: Date;
  source: GoalProgressSource;
}

export interface GoalDriftContext {
  goal: MerchantGoalRecord;
  progressPct: number;
  expectedPct: number;
  daysRemaining: number;
}

export const GOAL_METRIC_AGENT_MAP: Record<GoalMetricType, string> = {
  margin: 'pricing',
  revenue: 'workflow_supervisor',
  inventory: 'inventory',
  category_revenue: 'pricing',
};

export const GOAL_METRIC_DEFAULTS: Record<
  GoalMetricType,
  { unit: GoalUnit; direction: GoalDirection }
> = {
  margin: { unit: 'percent', direction: 'increase' },
  revenue: { unit: 'percent', direction: 'increase' },
  inventory: { unit: 'count', direction: 'decrease' },
  category_revenue: { unit: 'percent', direction: 'increase' },
};
