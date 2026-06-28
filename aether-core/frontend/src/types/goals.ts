export type GoalMetricType = 'margin' | 'revenue' | 'inventory' | 'category_revenue';
export type GoalDirection = 'increase' | 'decrease';
export type GoalPursuitMode = 'conservative' | 'balanced' | 'aggressive';
export type GoalStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type GoalUnit = 'percent' | 'count' | 'currency';

export interface GoalMetricScope {
  categoryId?: string;
  productSlug?: string;
  threshold?: number;
}

export interface MerchantGoal {
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
  deadline: string;
  status: GoalStatus;
  pursuitMode: GoalPursuitMode;
  parentGoalId: string | null;
  progressPct: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  outcomeRecordId?: string | null;
  verifiedUplift?: number | null;
  children?: MerchantGoal[];
}

export interface GoalProgressSnapshot {
  id: string;
  goalId: string;
  tenantId: string;
  value: number;
  progressPct: number;
  recordedAt: string;
  source: string;
}

export interface GoalSuggestion {
  id: string;
  title: string;
  metricType: GoalMetricType;
  suggestedTarget: number;
  suggestedBaseline: number;
  suggestedDeadline: string;
  confidence: number;
  rationale: string;
  evidence: Record<string, unknown>;
  status: string;
}

export interface GoalConflict {
  type: string;
  goalIds: string[];
  message: string;
  severity: string;
}

export interface CreateGoalPayload {
  title: string;
  description?: string;
  metricType: GoalMetricType;
  metricScope?: GoalMetricScope;
  targetValue: number;
  baselineValue?: number;
  unit?: GoalUnit;
  direction?: GoalDirection;
  deadline: string;
  pursuitMode?: GoalPursuitMode;
  parentGoalId?: string;
}

export interface UpdateGoalPayload {
  title?: string;
  description?: string | null;
  targetValue?: number;
  deadline?: string;
  status?: GoalStatus;
  pursuitMode?: GoalPursuitMode;
}

export interface GoalsListResponse {
  goals: MerchantGoal[];
}

export interface GoalDetailResponse {
  goal: MerchantGoal;
  snapshots: GoalProgressSnapshot[];
  children?: MerchantGoal[];
}

export interface GoalLinkedSuggestionsResponse {
  suggestions: import('@/types/suggestions').ApiProactiveSuggestion[];
}

export interface AiGoalSuggestionsResponse {
  suggestions: GoalSuggestion[];
}

export interface GoalConflictsResponse {
  conflicts: GoalConflict[];
  ranked: Array<{ goal: MerchantGoal; priorityScore: number; conflictWarnings: string[] }>;
}
