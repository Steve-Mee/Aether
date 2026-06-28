const DEFAULT_GOAL_PROGRESS_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function isGoalsEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return process.env.GOALS_ENABLED === 'true';
  }
  return process.env.GOALS_ENABLED !== 'false';
}

export function resolveGoalProgressIntervalMs(): number {
  const raw = Number(process.env.GOAL_PROGRESS_INTERVAL_MS);
  if (Number.isFinite(raw) && raw >= 60_000) return raw;
  return DEFAULT_GOAL_PROGRESS_INTERVAL_MS;
}

export function resolvePursuitCheckIntervalMs(mode: string): number {
  switch (mode) {
    case 'conservative':
      return 12 * 60 * 60 * 1000;
    case 'aggressive':
      return 3 * 60 * 60 * 1000;
    default:
      return 6 * 60 * 60 * 1000;
  }
}

/** Max relative change allowed per metric type over goal horizon (fraction). */
export const GOAL_MAX_RELATIVE_CHANGE: Record<string, number> = {
  margin: 0.3,
  revenue: 0.5,
  inventory: 0.5,
  category_revenue: 0.5,
};

export const GOAL_MIN_HORIZON_DAYS = 7;
export const GOAL_MAX_HORIZON_DAYS = 365;
export const GOAL_DRIFT_THRESHOLD_PCT = 15;

export function isGoalOutcomeAttributionEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return process.env.GOAL_OUTCOME_ATTRIBUTION_ENABLED === 'true';
  }
  return process.env.GOAL_OUTCOME_ATTRIBUTION_ENABLED !== 'false';
}

export function isGoalAiSuggestionsEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return process.env.GOAL_AI_SUGGESTIONS_ENABLED === 'true';
  }
  return process.env.GOAL_AI_SUGGESTIONS_ENABLED !== 'false';
}

export function isGoalMultiOptimizationEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return process.env.GOAL_MULTI_OPTIMIZATION_ENABLED === 'true';
  }
  return process.env.GOAL_MULTI_OPTIMIZATION_ENABLED !== 'false';
}

export function isGoalPlanningGraphEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return process.env.GOAL_PLANNING_GRAPH_ENABLED === 'true';
  }
  return process.env.GOAL_PLANNING_GRAPH_ENABLED !== 'false';
}

export function isGoalFederatedPatternsEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return process.env.GOAL_FEDERATED_PATTERNS_ENABLED === 'true';
  }
  return process.env.GOAL_FEDERATED_PATTERNS_ENABLED !== 'false';
}

export const GOAL_SUGGESTION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
export const GOAL_PLANNING_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
