import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '@/types/activity';
import { DEFAULT_OVERVIEW_FILTERS } from '../../types';
import {
  filterOverviewActivityItems,
  filterOverviewProactiveSuggestions,
  isGoalRelatedActivity,
  periodToDays,
  showActivityFeed,
  showProactiveSection,
} from '../overviewFilters';

function activity(partial: Partial<ActivityItem> & Pick<ActivityItem, 'id'>): ActivityItem {
  return {
    source: 'audit',
    at: new Date().toISOString(),
    actionType: 'test',
    actionLabel: 'Test',
    description: 'Test beschrijving',
    module: 'admin',
    risk: 'low',
    status: 'info',
    executor: 'aether',
    ...partial,
  };
}

describe('overviewFilters', () => {
  it('maps period to days', () => {
    expect(periodToDays('24h')).toBe(1);
    expect(periodToDays('7d')).toBe(7);
    expect(periodToDays('30d')).toBe(30);
  });

  it('detects goal-related activity', () => {
    expect(isGoalRelatedActivity(activity({ id: '1', details: { goalId: 'g1' } }))).toBe(true);
    expect(isGoalRelatedActivity(activity({ id: '2', actionType: 'goal_progress' }))).toBe(true);
    expect(isGoalRelatedActivity(activity({ id: '3' }))).toBe(false);
  });

  it('filters autonomous actions', () => {
    const items = [
      activity({ id: 'a', status: 'autonomous' }),
      activity({ id: 'b', status: 'info' }),
    ];
    const filtered = filterOverviewActivityItems(items, {
      ...DEFAULT_OVERVIEW_FILTERS,
      actionType: 'autonomous',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('a');
  });

  it('filters by agent key', () => {
    const items = [
      activity({ id: 'a', agentKeys: ['inventory'] }),
      activity({ id: 'b', agentKeys: ['pricing'] }),
    ];
    const filtered = filterOverviewActivityItems(items, {
      ...DEFAULT_OVERVIEW_FILTERS,
      agentKey: 'inventory',
    });
    expect(filtered.map((i: { id: string }) => i.id)).toEqual(['a']);
  });

  it('filters by search query', () => {
    const items = [
      activity({ id: 'a', description: 'Voorraad bijbestellen' }),
      activity({ id: 'b', description: 'Prijs update' }),
    ];
    const filtered = filterOverviewActivityItems(items, {
      ...DEFAULT_OVERVIEW_FILTERS,
      searchQuery: 'voorraad',
    });
    expect(filtered).toHaveLength(1);
  });

  it('hides activity feed for proactive-only filter', () => {
    expect(showProactiveSection({ ...DEFAULT_OVERVIEW_FILTERS, actionType: 'proactive' })).toBe(
      true,
    );
    expect(showActivityFeed({ ...DEFAULT_OVERVIEW_FILTERS, actionType: 'proactive' })).toBe(false);
  });

  it('filters proactive suggestions by search', () => {
    const suggestions = [
      {
        id: '1',
        title: 'Voorraad aanvullen',
        impactHint: '3 SKU',
        category: 'orders' as const,
        intentId: 'RETURN_RISK_ORDERS' as const,
        command: 'restock',
        linkedInsightId: null,
        executionMode: 'approval_required' as const,
      },
      {
        id: '2',
        title: 'Prijs optimaliseren',
        category: 'prijs' as const,
        intentId: 'PRICING_OPTIMIZATION' as const,
        command: 'price',
        linkedInsightId: null,
        executionMode: 'inform_only' as const,
      },
    ];
    const filtered = filterOverviewProactiveSuggestions(suggestions, {
      ...DEFAULT_OVERVIEW_FILTERS,
      searchQuery: 'voorraad',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.id).toBe('1');
  });
});
