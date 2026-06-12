/**
 * Activity / audit feed types.
 * @see GET /api/admin/activity
 */

export type ActivityPeriod = 'today' | '7d' | '30d' | 'custom';

export type ActivityRisk = 'low' | 'high' | 'none';

export type ActivityStatus = 'autonomous' | 'approved' | 'rejected' | 'pending' | 'info';

export type ActivityExecutor = 'aether' | 'merchant';

export type ActivityCategory =
  | 'all'
  | 'pricing'
  | 'supplier'
  | 'sync'
  | 'approval'
  | 'mail'
  | 'command'
  | 'outcome';

export type ActivityRiskFilter = 'all' | 'low' | 'high';

export type ActivityExecutorFilter = 'all' | 'aether' | 'merchant';

export type ActivityStatusFilter = 'all' | 'autonomous' | 'approved' | 'rejected' | 'pending';

export interface ActivityImpact {
  label: string;
  value: string;
}

export interface ActivityRelated {
  type: 'approval' | 'insight' | 'email';
  id: string;
}

export interface ActivityItem {
  id: string;
  source: 'audit' | 'command' | 'demo';
  at: string;
  actionType: string;
  actionLabel: string;
  description: string;
  module: string;
  category?: ActivityCategory;
  risk: ActivityRisk;
  status: ActivityStatus;
  executor: ActivityExecutor;
  impact?: ActivityImpact;
  confidence?: number;
  rationale?: string;
  related?: ActivityRelated;
  details?: Record<string, unknown>;
  searchText?: string;
}

export interface ActivityFeedResponse {
  items: ActivityItem[];
  source: 'live' | 'partial';
}

export interface ActivityFilters {
  category: ActivityCategory;
  risk: ActivityRiskFilter;
  executor: ActivityExecutorFilter;
  status: ActivityStatusFilter;
  searchQuery: string;
}

export interface ActivityCustomRange {
  from: string;
  to: string;
}
