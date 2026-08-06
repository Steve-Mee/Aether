import { describe, expect, it, vi } from 'vitest';
import { mergeActivityFeed } from './mergeActivityFeed';
import type { ActivityFeedResponse } from '@/types/activity';

vi.mock('@/lib/config', () => ({
  env: { hybridDemo: false },
}));

describe('mergeActivityFeed', () => {
  it('does not pad with demo items when hybridDemo is off', () => {
    const live: ActivityFeedResponse = {
      source: 'live',
      items: [
        {
          id: 'live-1',
          at: new Date().toISOString(),
          actionType: 'command_executed',
          actionLabel: 'Live action',
          description: 'Real',
          module: 'admin',
          source: 'audit',
          risk: 'low',
          status: 'completed',
          executor: 'system',
        },
      ],
    };

    const merged = mergeActivityFeed({ period: '7d', live });
    expect(merged.liveCount).toBe(1);
    expect(merged.demoCount).toBe(0);
    expect(merged.items.every((i) => i.id === 'live-1' || i.source !== 'demo')).toBe(true);
    expect(merged.items.some((i) => i.id.startsWith('demo-'))).toBe(false);
  });
});
