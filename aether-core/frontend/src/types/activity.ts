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

export type ActivityStatusFilter =
  | 'all'
  | 'autonomous'
  | 'approved'
  | 'rejected'
  | 'pending'
  | 'info';

export type ActivityModuleFilter = 'all' | string;

export type ActivityExecutionModeFilter =
  | 'all'
  | 'autonomous'
  | 'approval_required'
  | 'inform_only';

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
  agentKeys?: string[];
}

export type ActivityAgentFilter = 'all' | string;

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
  agentKey: ActivityAgentFilter;
  module: ActivityModuleFilter;
  executionMode: ActivityExecutionModeFilter;
}

export interface ActivityCustomRange {
  from: string;
  to: string;
}
