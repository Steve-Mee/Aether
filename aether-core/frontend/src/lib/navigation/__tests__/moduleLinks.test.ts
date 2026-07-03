import { describe, expect, it } from 'vitest';
import { overviewHighlight, overviewWithFilters } from '../moduleLinks';

describe('moduleLinks overview helpers', () => {
  it('builds highlight deep link', () => {
    expect(overviewHighlight('approval', 'appr-1')).toBe('/overview?highlight=approval%3Aappr-1');
    expect(overviewHighlight('activity', 'audit-42')).toBe(
      '/overview?highlight=activity%3Aaudit-42',
    );
    expect(overviewHighlight('proactive', 'ps-1')).toBe('/overview?highlight=proactive%3Aps-1');
    expect(overviewHighlight('section', 'goals')).toBe('/overview?highlight=section%3Agoals');
  });

  it('builds filter deep link', () => {
    expect(overviewWithFilters({ agent: 'inventory', risk: 'high' })).toBe(
      '/overview?agent=inventory&risk=high',
    );
  });
});
