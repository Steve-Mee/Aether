jest.mock('../../../../../../shared/prisma/client', () => ({
  prisma: {
    merchantNotification: {
      findFirst: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

import { prisma } from '../../../../../../shared/prisma/client';
import { applyNotificationGrouping } from '../NotificationGrouper';

describe('NotificationGrouper', () => {
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
    const result = await applyNotificationGrouping(
      't1',
      { ...baseNotification, kind: 'agent_handoff' },
      'overview_feed',
      'f1',
    );
    expect(result.hideIndividual).toBe(false);
    expect(prisma.merchantNotification.findFirst).not.toHaveBeenCalled();
  });

  it('starts new group when none exists', async () => {
    (prisma.merchantNotification.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await applyNotificationGrouping(
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
    (prisma.merchantNotification.findFirst as jest.Mock).mockResolvedValue({
      id: 'rollup-1',
      groupCount: 1,
      createdAt: new Date(),
      href: '/command-center',
      actionLabel: 'Open',
    });

    const result = await applyNotificationGrouping(
      't1',
      baseNotification,
      'proactive_suggestion',
      'ps-2',
    );

    expect(result.hideIndividual).toBe(true);
    expect(result.notification.id).toBe('rollup-1');
    expect(result.notification.groupCount).toBe(2);
    expect(result.notification.title).toContain('2');
    expect(prisma.merchantNotification.update).toHaveBeenCalled();
  });
});
