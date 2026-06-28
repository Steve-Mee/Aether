import { describe, expect, it } from 'vitest';
import type { ActivityItem } from '@/types/activity';
import {
  inferExecutionMode,
  matchesExecutionMode,
  matchesModule,
} from '../activityFilterUtils';

const baseItem: ActivityItem = {
  id: '1',
  source: 'demo',
  at: new Date().toISOString(),
  actionType: 'test',
  actionLabel: 'Test',
  description: 'Test item',
  module: 'admin-command-bar',
  risk: 'low',
  status: 'info',
  executor: 'merchant',
};

describe('inferExecutionMode', () => {
  it('uses details.executionMode when present', () => {
    expect(
      inferExecutionMode({
        ...baseItem,
        details: { executionMode: 'autonomous' },
        status: 'info',
      }),
    ).toBe('autonomous');
  });

  it('maps autonomous status to autonomous mode', () => {
    expect(inferExecutionMode({ ...baseItem, status: 'autonomous' })).toBe('autonomous');
  });

  it('maps pending status to approval_required', () => {
    expect(inferExecutionMode({ ...baseItem, status: 'pending' })).toBe('approval_required');
  });
});

describe('matchesModule', () => {
  it('matches exact module', () => {
    expect(matchesModule(baseItem, 'admin-command-bar')).toBe(true);
    expect(matchesModule(baseItem, 'aether-mail')).toBe(false);
  });

  it('allows all modules when filter is all', () => {
    expect(matchesModule(baseItem, 'all')).toBe(true);
  });
});

describe('matchesExecutionMode', () => {
  it('filters by inferred execution mode', () => {
    const autonomous = { ...baseItem, status: 'autonomous' as const };
    expect(matchesExecutionMode(autonomous, 'autonomous')).toBe(true);
    expect(matchesExecutionMode(autonomous, 'inform_only')).toBe(false);
  });
});
