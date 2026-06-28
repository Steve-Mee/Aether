import { describe, expect, it } from 'vitest';
import { parseOverviewHighlight, searchParamsToFilters } from '../overviewUrlSync';
import { DEFAULT_OVERVIEW_FILTERS } from '../../types';

describe('overviewUrlSync', () => {
  it('parses highlight deep link', () => {
    expect(parseOverviewHighlight('approval:appr-1')).toEqual({
      kind: 'approval',
      id: 'appr-1',
    });
    expect(parseOverviewHighlight('activity:audit-1')).toEqual({
      kind: 'activity',
      id: 'audit-1',
    });
    expect(parseOverviewHighlight('invalid')).toBeNull();
  });

  it('maps URL search params to filters', () => {
    const params = new URLSearchParams('agent=inventory&risk=high&actionType=approval&period=30d');
    expect(searchParamsToFilters(params, DEFAULT_OVERVIEW_FILTERS)).toMatchObject({
      agentKey: 'inventory',
      risk: 'high',
      actionType: 'approval',
      period: '30d',
    });
  });
});
