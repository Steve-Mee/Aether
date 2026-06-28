/** Hive-mind aligned categories allowed for outbound knowledge contribution. */
export const ALLOWED_CONTRIBUTION_CATEGORIES = new Set([
  'pricing',
  'conversion',
  'trend',
  'inventory',
  'marketing',
]);

export type ContributionCategory =
  | 'pricing'
  | 'conversion'
  | 'trend'
  | 'inventory'
  | 'marketing';

/** Metric name prefixes / exact names permitted in v1 (structured metrics only). */
export const ALLOWED_METRIC_PATTERNS: RegExp[] = [
  /^price_elasticity_estimate$/,
  /^promo_uplift_rate$/,
  /^seasonal_demand_index$/,
  /^agent_run_success_rate$/,
  /^price_change_success_rate$/,
  /^auto_apply_rate$/,
  /^mail_auto_reply_rate$/,
  /^conversion_rate$/,
  /^average_price$/,
  /^[a-zA-Z][a-zA-Z0-9_]*_tool_approval_rate$/,
  /^[a-zA-Z][a-zA-Z0-9_]*_tool_rejection_rate$/,
  /^[a-zA-Z][a-zA-Z0-9_]*_success_rate$/,
  /^proactive_(execute|dismiss|snooze)_rate$/,
  /^goal_completion_rate$/,
  /^goal_drift_recovery_rate$/,
];

/** Metrics whose values must be in [0, 1] (rates / probabilities). */
export const RATE_METRICS = new Set([
  'agent_run_success_rate',
  'price_change_success_rate',
  'auto_apply_rate',
  'mail_auto_reply_rate',
  'conversion_rate',
  'promo_uplift_rate',
  'reflection_failure_rate',
  'multi_step_completion_rate',
  'high_impact_success_rate',
  'proactive_execute_rate',
  'proactive_dismiss_rate',
  'proactive_snooze_rate',
  'goal_completion_rate',
  'goal_drift_recovery_rate',
]);

/** Metrics whose values must be in [-10, 10] (normalized indices). */
export const INDEX_METRICS = new Set(['price_elasticity_estimate', 'seasonal_demand_index']);

/** Substrings that must never appear in metric names (merchant-specific leakage). */
export const FORBIDDEN_METRIC_SUBSTRINGS = [
  'tenant',
  'merchant',
  'sku',
  'supplier',
  'customer',
  'email',
  'iban',
  'order',
  'product_name',
];

export const TOOL_CATEGORY_MAP: Record<
  string,
  ContributionCategory
> = {
  updatePrice: 'pricing',
  syncSupplier: 'inventory',
  suggestRestock: 'inventory',
  createInsight: 'marketing',
  createApproval: 'trend',
  search_products: 'inventory',
  recall_memory: 'trend',
  getProductInfo: 'inventory',
  get_collective_insights: 'marketing',
};

export function mapToolToCategory(tool: string): ContributionCategory {
  return TOOL_CATEGORY_MAP[tool] ?? 'trend';
}

export function mapIntentToCategory(intent: string): ContributionCategory {
  if (intent === 'PRICE_UPDATE' || intent === 'LOW_MARGIN_REPORT') return 'pricing';
  if (intent === 'COMPOUND_WORKFLOW') return 'trend';
  return 'trend';
}

export function isAllowedCategory(category: string): category is ContributionCategory {
  return ALLOWED_CONTRIBUTION_CATEGORIES.has(category);
}

export function isAllowedMetric(metric: string): boolean {
  const lower = metric.toLowerCase();
  if (FORBIDDEN_METRIC_SUBSTRINGS.some((s) => lower.includes(s))) return false;
  return ALLOWED_METRIC_PATTERNS.some((p) => p.test(metric));
}

export function isValueInBounds(metric: string, value: number): boolean {
  if (!Number.isFinite(value)) return false;
  if (metric.endsWith('_tool_approval_rate') || metric.endsWith('_tool_rejection_rate')) {
    return value === 0 || value === 1;
  }
  if (metric.endsWith('_success_rate') || RATE_METRICS.has(metric)) {
    return value >= 0 && value <= 1;
  }
  if (INDEX_METRICS.has(metric)) {
    return value >= -10 && value <= 10;
  }
  if (metric === 'average_price') {
    return value >= 0 && value <= 1;
  }
  return value >= -10 && value <= 10;
}
