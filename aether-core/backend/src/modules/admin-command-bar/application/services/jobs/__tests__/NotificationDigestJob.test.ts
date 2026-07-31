jest.mock('../../../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn(),
}));

jest.mock('../../notifications/NotificationEmitter', () => ({
  notificationEmitter: { emit: jest.fn() },
}));

jest.mock('../../notifications/NotificationWriter', () => ({
  NotificationWriterService: jest.fn(),
}));

import { getMerchantSettings } from '../../../../../../shared/settings/TenantSettingsService';
import type { TenantDirectoryPort } from '../../../ports/TenantDirectoryPort';
import type { NotificationPort } from '../../../ports/NotificationPort';
import type { OverviewNotificationDispatcher } from '../../OverviewNotificationDispatcher';
import type { NotificationWriterService } from '../../notifications/NotificationWriter';
import { NotificationDigestJob } from '../NotificationDigestJob';

describe('NotificationDigestJob', () => {
  const tenantDirectory: jest.Mocked<TenantDirectoryPort> = {
    listTenantIds: jest.fn(),
  };
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
  const overviewNotificationDispatcher = {
    sendDigestForTenant: jest.fn(),
  } as jest.Mocked<Pick<OverviewNotificationDispatcher, 'sendDigestForTenant'>>;
  const notificationWriter = {
    materializeNotification: jest.fn(),
  } as unknown as jest.Mocked<NotificationWriterService>;

  const job = new NotificationDigestJob(
    tenantDirectory,
    notificationPort,
    overviewNotificationDispatcher as unknown as OverviewNotificationDispatcher,
    notificationWriter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('skips immediate frequency tenants', async () => {
    (getMerchantSettings as jest.Mock).mockResolvedValue({
      notificationPrefs: { frequency: 'immediate', weeklyDigest: { inApp: true, email: true } },
    });

    const sent = await job.runForTenant('t1');
    expect(sent).toBe(0);
    expect(overviewNotificationDispatcher.sendDigestForTenant).not.toHaveBeenCalled();
  });

  it('sends daily digest when window elapsed', async () => {
    (getMerchantSettings as jest.Mock).mockResolvedValue({
      notificationPrefs: { frequency: 'daily', weeklyDigest: { inApp: true, email: true } },
    });
    notificationPort.upsertDigestState.mockResolvedValue({
      lastSentAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      lastWindowStart: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    overviewNotificationDispatcher.sendDigestForTenant.mockResolvedValue(3);

    const sent = await job.runForTenant('t1');
    expect(sent).toBe(3);
    expect(notificationPort.updateDigestState).toHaveBeenCalled();
  });

  it('waits for weekly window when not elapsed', async () => {
    (getMerchantSettings as jest.Mock).mockResolvedValue({
      notificationPrefs: { frequency: 'weekly', weeklyDigest: { inApp: true, email: true } },
    });
    notificationPort.upsertDigestState.mockResolvedValue({
      lastSentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      lastWindowStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const sent = await job.runForTenant('t1');
    expect(sent).toBe(0);
    expect(overviewNotificationDispatcher.sendDigestForTenant).not.toHaveBeenCalled();
  });
});
