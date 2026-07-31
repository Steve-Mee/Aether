jest.mock('../NotificationGrouper', () => ({
  NotificationGrouper: jest.fn().mockImplementation(() => ({
    applyNotificationGrouping: jest.fn(async (_tenantId, notification) => ({
      notification,
      hideIndividual: false,
    })),
  })),
}));

jest.mock('../notificationConfig', () => ({
  isNotificationMaterializeEnabled: jest.fn(() => true),
}));

import type { NotificationPort } from '../../../ports/NotificationPort';
import { NotificationGrouper } from '../NotificationGrouper';
import { isNotificationMaterializeEnabled } from '../notificationConfig';
import { NotificationWriterService } from '../NotificationWriter';

describe('NotificationWriter', () => {
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
  const service = new NotificationWriterService(notificationPort, grouper);

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

    const result = await service.materializeNotification({
      tenantId: 't1',
      notification,
      sourceType: 'test',
      sourceId: 'n-1',
    });

    expect(result).toEqual(notification);
    expect(notificationPort.upsertNotification).not.toHaveBeenCalled();
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

    const result = await service.materializeNotification({
      tenantId: 't1',
      notification,
      sourceType: 'proactive_suggestion',
      sourceId: 'ps-1',
    });

    expect(notificationPort.upsertNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'n-2',
        tenantId: 't1',
        sourceType: 'proactive_suggestion',
      }),
    );
    expect(result?.id).toBe('n-2');
  });
});
