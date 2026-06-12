import { prisma } from '../../../../../shared/prisma/client';
import {
  dismissNotification,
  getNotificationStateMap,
  markAllNotificationsRead,
  markNotificationRead,
} from '../NotificationReadStateService';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    notificationInboxState: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
  },
}));

describe('NotificationReadStateService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getNotificationStateMap partitions read and dismissed ids', async () => {
    (prisma.notificationInboxState.findMany as jest.Mock).mockResolvedValue([
      { notificationId: 'n1', readAt: new Date(), dismissedAt: null },
      { notificationId: 'n2', readAt: new Date(), dismissedAt: new Date() },
    ]);

    const map = await getNotificationStateMap('tenant_default', 'user-1');
    expect(map.readIds.has('n1')).toBe(true);
    expect(map.dismissedIds.has('n2')).toBe(true);
  });

  it('markNotificationRead upserts read state', async () => {
    await markNotificationRead('tenant_default', 'user-1', 'notif-1');
    expect(prisma.notificationInboxState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId_actorId_notificationId: {
            tenantId: 'tenant_default',
            actorId: 'user-1',
            notificationId: 'notif-1',
          },
        },
      })
    );
  });

  it('markAllNotificationsRead upserts each id', async () => {
    await markAllNotificationsRead('tenant_default', 'user-1', ['a', 'b']);
    expect(prisma.notificationInboxState.upsert).toHaveBeenCalledTimes(2);
  });

  it('dismissNotification sets dismissedAt', async () => {
    await dismissNotification('tenant_default', 'user-1', 'notif-9');
    expect(prisma.notificationInboxState.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          notificationId: 'notif-9',
          dismissedAt: expect.any(Date),
        }),
      })
    );
  });
});
