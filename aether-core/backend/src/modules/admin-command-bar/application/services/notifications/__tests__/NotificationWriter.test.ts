jest.mock('../../../../../../shared/prisma/client', () => ({
  prisma: {
    merchantNotification: {
      upsert: jest.fn(),
    },
  },
}));

jest.mock('../NotificationGrouper', () => ({
  applyNotificationGrouping: jest.fn(async (_tenantId, notification) => ({
    notification,
    hideIndividual: false,
  })),
}));

jest.mock('../notificationConfig', () => ({
  isNotificationMaterializeEnabled: jest.fn(() => true),
}));

import { prisma } from '../../../../../../shared/prisma/client';
import { isNotificationMaterializeEnabled } from '../notificationConfig';
import { materializeNotification } from '../NotificationWriter';

describe('NotificationWriter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns notification without upsert when materialize disabled', async () => {
    (isNotificationMaterializeEnabled as jest.Mock).mockReturnValue(false);
    const notification = {
      id: 'n-1',
      kind: 'system' as const,
      title: 'Test',
      body: 'Body',
      severity: 'info' as const,
      read: false,
      createdAt: new Date().toISOString(),
      source: 'system' as const,
    };

    const result = await materializeNotification({
      tenantId: 't1',
      notification,
      sourceType: 'test',
      sourceId: 'n-1',
    });

    expect(result).toEqual(notification);
    expect(prisma.merchantNotification.upsert).not.toHaveBeenCalled();
  });

  it('upserts notification when materialize enabled', async () => {
    (isNotificationMaterializeEnabled as jest.Mock).mockReturnValue(true);
    const notification = {
      id: 'n-2',
      kind: 'proactive_suggestion' as const,
      title: 'Suggestie',
      body: 'Kijk hier',
      severity: 'info' as const,
      read: false,
      createdAt: '2026-06-01T10:00:00.000Z',
      source: 'system' as const,
      category: 'proactive_suggestion' as const,
    };

    const result = await materializeNotification({
      tenantId: 't1',
      notification,
      sourceType: 'proactive_suggestion',
      sourceId: 'ps-1',
    });

    expect(prisma.merchantNotification.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'n-2' },
        create: expect.objectContaining({ tenantId: 't1', sourceType: 'proactive_suggestion' }),
      }),
    );
    expect(result?.id).toBe('n-2');
  });
});
