import {
  crossedGoalMilestone,
  goalMilestoneNotificationId,
  kindToCategory,
} from '../notifications/notificationTypes';
import {
  mapActivityToNotification,
  mapOverviewFeedItemToNotification,
  mapPendingApprovalsNotification,
} from '../notifications/notificationMappers';
import type { ActivityFeedItem } from '../ActivityFeedService';

describe('notificationTypes', () => {
  it('maps kinds to categories', () => {
    expect(kindToCategory('proactive_suggestion')).toBe('proactive_suggestion');
    expect(kindToCategory('goal_completed')).toBe('goal_progress');
    expect(kindToCategory('agent_handoff')).toBe('autonomous_low_risk');
  });

  it('detects crossed milestones', () => {
    expect(crossedGoalMilestone(20, 26)).toBe(25);
    expect(crossedGoalMilestone(24, 25)).toBe(25);
    expect(crossedGoalMilestone(50, 55)).toBeNull();
  });

  it('builds stable milestone ids', () => {
    expect(goalMilestoneNotificationId('g1', 50)).toBe('goal-milestone-g1-50');
  });
});

describe('mapActivityToNotification', () => {
  const base: ActivityFeedItem = {
    id: 'audit-1',
    source: 'audit',
    at: '2026-06-01T10:00:00.000Z',
    actionType: 'autonomy_execute',
    actionLabel: 'Autonome actie',
    description: 'Voorraad gesynchroniseerd',
    module: 'supplier-intelligence',
    risk: 'low',
    status: 'autonomous',
    executor: 'aether',
  };

  it('skips navigation events', () => {
    expect(
      mapActivityToNotification({ ...base, actionType: 'ui.navigation', module: 'admin-command-bar' }),
    ).toBeNull();
  });

  it('maps supplier activity to supplier_change kind', () => {
    const n = mapActivityToNotification(base);
    expect(n?.kind).toBe('supplier_change');
    expect(n?.category).toBe('supplier_change');
    expect(n?.href).toBe('/suppliers');
  });

  it('maps pending high-risk approval', () => {
    const n = mapActivityToNotification({
      ...base,
      module: 'approval',
      risk: 'high',
      status: 'pending',
      related: { type: 'approval', id: 'ap-1' },
    });
    expect(n?.kind).toBe('approval_needed');
    expect(n?.severity).toBe('action');
    expect(n?.href).toContain('approval');
  });
});

describe('mapOverviewFeedItemToNotification', () => {
  it('ignores non-milestone goal snapshots', () => {
    expect(
      mapOverviewFeedItemToNotification({
        kind: 'goal_snapshot',
        at: '2026-06-01T10:00:00.000Z',
        id: 'g1',
        cursor: '',
        payload: { id: 'g1', title: 'Omzet', progressPct: 42 },
      }),
    ).toBeNull();
  });

  it('maps milestone goal snapshots', () => {
    const n = mapOverviewFeedItemToNotification({
      kind: 'goal_snapshot',
      at: '2026-06-01T10:00:00.000Z',
      id: 'g1',
      cursor: '',
      payload: { id: 'g1', title: 'Omzet', progressPct: 50, milestoneThreshold: 50, isMilestone: true },
    });
    expect(n?.kind).toBe('goal_progress');
    expect(n?.id).toBe('goal-milestone-g1-50');
  });

  it('maps agent handoffs', () => {
    const n = mapOverviewFeedItemToNotification({
      kind: 'agent_handoff',
      at: '2026-06-01T10:00:00.000Z',
      id: 'h1',
      cursor: '',
      payload: {
        fromAgentKey: 'pricing',
        toAgentKey: 'inventory',
        summary: 'Stock check',
      },
    });
    expect(n?.kind).toBe('agent_handoff');
    expect(n?.title).toContain('pricing');
  });
});

describe('mapPendingApprovalsNotification', () => {
  it('creates aggregate approval notification', () => {
    const n = mapPendingApprovalsNotification(3, false);
    expect(n.kind).toBe('approval_needed');
    expect(n.body).toContain('3');
  });
});
