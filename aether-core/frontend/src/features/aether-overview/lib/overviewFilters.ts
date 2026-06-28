import { agentDisplayLabel } from '@/lib/agentDisplay';
import { matchesSearch } from '@/lib/activityPresentation';
import type { ActivityItem } from '@/types/activity';
import type { ProactiveSuggestion } from '@/lib/proactiveSuggestionsDemo';
import type { OverviewActionType, OverviewFilters } from '../types';

export function periodToDays(period: OverviewFilters['period']): number {
  switch (period) {
    case '24h':
      return 1;
    case '7d':
      return 7;
    case '30d':
      return 30;
    default:
      return 7;
  }
}

export function itemAgentKeys(item: ActivityItem): string[] {
  if (item.agentKeys?.length) return item.agentKeys;
  if (typeof item.details?.agentKey === 'string') return [item.details.agentKey];
  if (Array.isArray(item.details?.agentKeys)) {
    return item.details.agentKeys as string[];
  }
  return [];
}

export function isGoalRelatedActivity(item: ActivityItem): boolean {
  if (item.details?.goalId != null) return true;
  if (typeof item.actionType === 'string' && /goal/i.test(item.actionType)) return true;
  if (typeof item.module === 'string' && item.module.includes('goal')) return true;
  return false;
}

export function matchesOverviewActionType(
  item: ActivityItem,
  actionType: OverviewActionType,
): boolean {
  if (actionType === 'all') return true;
  if (actionType === 'autonomous') return item.status === 'autonomous';
  if (actionType === 'goal') return isGoalRelatedActivity(item);
  return true;
}

export function matchesOverviewAgent(item: ActivityItem, agentKey: string): boolean {
  if (agentKey === 'all') return true;
  return itemAgentKeys(item).includes(agentKey);
}

export function matchesOverviewSearchText(text: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return text.toLowerCase().includes(q);
}

export function filterOverviewActivityItems(
  items: ActivityItem[],
  filters: OverviewFilters,
): ActivityItem[] {
  if (filters.actionType === 'proactive') return [];

  return items
    .filter((item) => matchesOverviewAgent(item, filters.agentKey))
    .filter((item) => matchesOverviewActionType(item, filters.actionType))
    .filter((item) => matchesSearch(item, filters.searchQuery));
}

export function filterOverviewProactiveSuggestions(
  suggestions: ProactiveSuggestion[],
  filters: OverviewFilters,
): ProactiveSuggestion[] {
  return suggestions.filter((s) => {
    if (filters.agentKey !== 'all') {
      const agentKey = (s as ProactiveSuggestion & { agentKey?: string }).agentKey;
      if (agentKey && agentKey !== filters.agentKey) return false;
    }
    const searchText = `${s.title} ${s.impactHint ?? ''} ${agentDisplayLabel(
      (s as ProactiveSuggestion & { agentKey?: string }).agentKey ?? '',
    )}`;
    return matchesOverviewSearchText(searchText, filters.searchQuery);
  });
}

export function showProactiveSection(filters: OverviewFilters): boolean {
  return (
    filters.actionType === 'all' ||
    filters.actionType === 'proactive'
  );
}

export function showGoalsSection(filters: OverviewFilters): boolean {
  return filters.actionType === 'all' || filters.actionType === 'goal';
}

export function showActivityFeed(filters: OverviewFilters): boolean {
  return filters.actionType !== 'proactive';
}

export function showAttentionSection(filters: OverviewFilters): boolean {
  return filters.actionType === 'all' || filters.actionType === 'approval';
}
