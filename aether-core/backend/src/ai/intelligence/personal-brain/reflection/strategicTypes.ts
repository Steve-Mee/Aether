export interface StrategicReflection {
  goalProgress: GoalProgress[];
  strategyAdaptations: StrategyAdaptation[];
  insightsSummary: string;
  periodCovered: {
    from: string;
    to: string;
  };
  tenantId: string;
  agentKey?: string;
}

export interface GoalProgress {
  goal: string;
  status: 'on_track' | 'at_risk' | 'off_track' | 'achieved' | 'blocked';
  progress: number;
  keyActions: string[];
  blockers?: string[];
  recommendation?: string;
}

export interface StrategyAdaptation {
  currentStrategy: string;
  proposedAdaptation: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  confidence: number;
}

export interface StrategicReflectionInput {
  tenantId: string;
  agentKey?: string;
  periodDays?: number;
  focusAreas?: string[];
  /** Active merchant goals loaded from GoalService / repository — never invent goals when empty. */
  activeGoals?: ActiveGoalSnapshot[];
}

export interface ActiveGoalSnapshot {
  id: string;
  title: string;
  progressPct: number | null;
  targetValue: number;
  status: string;
  metricType: string;
}

export interface StrategicReflectionResult {
  reflection: StrategicReflection;
  memoryIds: string[];
}
