import type { NotificationPort } from '../../ports/NotificationPort';
import { NotificationReadStateService } from '../NotificationReadStateService';

jest.mock('../notifications/NotificationEmitter', () => ({
  notificationEmitter: {
    emitStateChanged: jest.fn(),
  },
}));

describe('NotificationReadStateService', () => {
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
  const service = new NotificationReadStateService(notificationPort);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getNotificationStateMap partitions read and dismissed ids', async () => {
    notificationPort.listInboxStates.mockResolvedValue([
      { notificationId: 'n1', readAt: new Date(), dismissedAt: null },
      { notificationId: 'n2', readAt: new Date(), dismissedAt: new Date() },
    ]);

    const map = await service.getNotificationStateMap('tenant_default', 'user-1');
    expect(map.readIds.has('n1')).toBe(true);
    expect(map.dismissedIds.has('n2')).toBe(true);
  });

  it('markNotificationRead upserts read state', async () => {
    await service.markNotificationRead('tenant_default', 'user-1', 'notif-1');
    expect(notificationPort.upsertInboxRead).toHaveBeenCalledWith(
      'tenant_default',
      'user-1',
      'notif-1',
      expect.any(Date),
      null,
    );
  });
});
