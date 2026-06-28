export type OverviewPeriod = '24h' | '7d' | '30d';

export type OverviewActionType = 'all' | 'proactive' | 'autonomous' | 'goal' | 'approval';

export type OverviewAgentFilter = 'all' | string;

export type OverviewRiskFilter = 'all' | 'low' | 'high';

export type OverviewModuleFilter = 'all' | string;

export type OverviewExecutionModeFilter =
  | 'all'
  | 'autonomous'
  | 'approval_required'
  | 'inform_only';

export interface OverviewFilters {
  agentKey: OverviewAgentFilter;
  actionType: OverviewActionType;
  period: OverviewPeriod;
  searchQuery: string;
  risk: OverviewRiskFilter;
  module: OverviewModuleFilter;
  executionMode: OverviewExecutionModeFilter;
}

export const DEFAULT_OVERVIEW_FILTERS: OverviewFilters = {
  agentKey: 'all',
  actionType: 'all',
  period: '7d',
  searchQuery: '',
  risk: 'all',
  module: 'all',
  executionMode: 'all',
};

export const OVERVIEW_ACTIVITY_LIMITS = [50, 100, 200] as const;

export type OverviewSectionKey =
  | 'attention'
  | 'agentMetrics'
  | 'handoffs'
  | 'proactive'
  | 'goals'
  | 'activity';

export type OverviewHighlightKind = 'activity' | 'approval' | 'proactive' | 'section';
