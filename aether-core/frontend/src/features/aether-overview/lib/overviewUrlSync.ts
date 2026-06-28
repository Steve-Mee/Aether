import type { OverviewFilters, OverviewHighlightKind } from '../types';

export function parseOverviewHighlight(
  raw: string | null,
): { kind: OverviewHighlightKind; id: string } | null {
  if (!raw) return null;
  const idx = raw.indexOf(':');
  if (idx <= 0) return null;
  const kind = raw.slice(0, idx) as OverviewHighlightKind;
  const id = raw.slice(idx + 1);
  if (!id) return null;
  if (kind !== 'activity' && kind !== 'approval' && kind !== 'proactive' && kind !== 'section') {
    return null;
  }
  return { kind, id };
}

export function filtersToSearchParams(filters: OverviewFilters): Record<string, string> {
  const params: Record<string, string> = {};
  if (filters.agentKey !== 'all') params.agent = filters.agentKey;
  if (filters.actionType !== 'all') params.actionType = filters.actionType;
  if (filters.period !== '7d') params.period = filters.period;
  if (filters.searchQuery.trim()) params.search = filters.searchQuery.trim();
  if (filters.risk !== 'all') params.risk = filters.risk;
  if (filters.module !== 'all') params.module = filters.module;
  if (filters.executionMode !== 'all') params.executionMode = filters.executionMode;
  return params;
}

export function searchParamsToFilters(
  params: URLSearchParams,
  defaults: OverviewFilters,
): OverviewFilters {
  const period = params.get('period');
  const actionType = params.get('actionType');
  return {
    agentKey: params.get('agent') ?? defaults.agentKey,
    actionType:
      actionType === 'proactive' ||
      actionType === 'autonomous' ||
      actionType === 'goal' ||
      actionType === 'approval'
        ? actionType
        : defaults.actionType,
    period: period === '24h' || period === '30d' ? period : defaults.period,
    searchQuery: params.get('search') ?? defaults.searchQuery,
    risk: params.get('risk') === 'high' || params.get('risk') === 'low' ? params.get('risk')! : defaults.risk,
    module: params.get('module') ?? defaults.module,
    executionMode:
      params.get('executionMode') === 'autonomous' ||
      params.get('executionMode') === 'approval_required' ||
      params.get('executionMode') === 'inform_only'
        ? params.get('executionMode')!
        : defaults.executionMode,
  };
}

export function feedQueryParams(filters: OverviewFilters): {
  days: number;
  agentKey?: string;
  risk?: 'low' | 'high';
  module?: string;
  executionMode?: 'autonomous' | 'approval_required' | 'inform_only';
  actionType?: 'proactive' | 'autonomous' | 'goal' | 'approval';
  search?: string;
} {
  const days = filters.period === '24h' ? 1 : filters.period === '30d' ? 30 : 7;
  return {
    days,
    agentKey: filters.agentKey !== 'all' ? filters.agentKey : undefined,
    risk: filters.risk !== 'all' ? filters.risk : undefined,
    module: filters.module !== 'all' ? filters.module : undefined,
    executionMode: filters.executionMode !== 'all' ? filters.executionMode : undefined,
    actionType:
      filters.actionType !== 'all'
        ? (filters.actionType as 'proactive' | 'autonomous' | 'goal' | 'approval')
        : undefined,
    search: filters.searchQuery.trim() || undefined,
  };
}
