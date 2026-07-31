import type { NotificationPort } from '../../../ports/NotificationPort';
import { NotificationGrouper } from '../NotificationGrouper';

describe('NotificationGrouper', () => {
  const notificationPort: jest.Mocked<NotificationPort> = {
    listVisibleSince: jest.fn(),
    listVisibleIdsSince: jest.fn(),
    listByGroupKey: jest.fn(),
    findRecentVisibleGroupMember: jest.fn(),
    updateNotification: jest.fn(),
    upsertNotification: jest.fn(),
    listInboxStates: jest.fn(),
    upsertInboxRead: jest.fn(),
    upsertManyInboxRead: jest.fn(),
    upsertDigestState: jest.fn(),
    updateDigestState: jest.fn(),
  };
  const grouper = new NotificationGrouper(notificationPort);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseNotification = {
    id: 'proactive-2',
    kind: 'proactive_suggestion' as const,
    title: 'Nieuwe suggestie',
    body: 'Body 2',
    severity: 'info' as const,
    read: false,
    createdAt: new Date().toISOString(),
    source: 'system' as const,
    category: 'proactive_suggestion' as const,
  };

  it('passes through non-groupable kinds', async () => {
    const result = await grouper.applyNotificationGrouping(
      't1',
      { ...baseNotification, kind: 'agent_handoff' },
      'overview_feed',
      'f1',
    );
    expect(result.hideIndividual).toBe(false);
    expect(notificationPort.findRecentVisibleGroupMember).not.toHaveBeenCalled();
  });

  it('starts new group when none exists', async () => {
    notificationPort.findRecentVisibleGroupMember.mockResolvedValue(null);

    const result = await grouper.applyNotificationGrouping(
      't1',
      baseNotification,
      'proactive_suggestion',
      'ps-2',
    );

    expect(result.hideIndividual).toBe(false);
    expect(result.notification.groupKey).toBe('proactive:t1');
    expect(result.notification.groupCount).toBe(1);
  });

  it('rolls up into existing group and hides individual', async () => {
    notificationPort.findRecentVisibleGroupMember.mockResolvedValue({
      id: 'rollup-1',
      kind: 'proactive_suggestion',
      category: 'proactive_suggestion',
      title: 'Rollup',
      body: 'Body',
      severity: 'info',
      href: '/command-center',
      actionLabel: 'Open',
      groupKey: 'proactive:t1',
      groupCount: 1,
      createdAt: new Date(),
    });

    const result = await grouper.applyNotificationGrouping(
      't1',
      baseNotification,
      'proactive_suggestion',
      'ps-2',
    );

    expect(result.hideIndividual).toBe(true);
    expect(result.notification.id).toBe('rollup-1');
    expect(result.notification.groupCount).toBe(2);
    expect(result.notification.title).toContain('2');
    expect(notificationPort.updateNotification).toHaveBeenCalled();
  });
});
