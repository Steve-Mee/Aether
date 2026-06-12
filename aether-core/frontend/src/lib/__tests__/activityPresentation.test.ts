import { describe, it, expect } from 'vitest';
import { filterActivityItems, matchesSearch } from '../activityPresentation';
import type { ActivityItem } from '@/types/activity';

const sample: ActivityItem = {
  id: 't1',
  source: 'demo',
  at: new Date().toISOString(),
  actionType: 'price_adjusted',
  actionLabel: 'Prijs',
  description: 'Outdoor marge +2%',
  module: 'inventory-pricing',
  category: 'pricing',
  risk: 'low',
  status: 'autonomous',
  executor: 'aether',
  searchText: 'outdoor marge prijs',
};

describe('activityPresentation', () => {
  it('matchesSearch on searchText', () => {
    expect(matchesSearch(sample, 'outdoor')).toBe(true);
    expect(matchesSearch(sample, 'xyz')).toBe(false);
  });

  it('filterActivityItems applies category filter', () => {
    const result = filterActivityItems([sample], '30d', {
      category: 'pricing',
      risk: 'all',
      executor: 'all',
      status: 'all',
      searchQuery: '',
    });
    expect(result).toHaveLength(1);
    const empty = filterActivityItems([sample], '30d', {
      category: 'mail',
      risk: 'all',
      executor: 'all',
      status: 'all',
      searchQuery: '',
    });
    expect(empty).toHaveLength(0);
  });
});
