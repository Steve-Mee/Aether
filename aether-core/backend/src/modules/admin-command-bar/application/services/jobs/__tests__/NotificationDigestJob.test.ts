jest.mock('../../../../../../shared/prisma/client', () => ({
  prisma: {
    tenantSettings: { findMany: jest.fn() },
    notificationDigestState: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn(),
}));

jest.mock('../../OverviewNotificationDispatcher', () => ({
  overviewNotificationDispatcher: {
    sendDigestForTenant: jest.fn(),
  },
}));

jest.mock('../../notifications/NotificationEmitter', () => ({
  notificationEmitter: { emit: jest.fn() },
}));

jest.mock('../../notifications/NotificationWriter', () => ({
  materializeNotification: jest.fn(),
}));

import { prisma } from '../../../../../../shared/prisma/client';
import { getMerchantSettings } from '../../../../../../shared/settings/TenantSettingsService';
import { overviewNotificationDispatcher } from '../../OverviewNotificationDispatcher';
import { NotificationDigestJob } from '../NotificationDigestJob';

describe('NotificationDigestJob', () => {
  const job = new NotificationDigestJob();

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
    (prisma.notificationDigestState.upsert as jest.Mock).mockResolvedValue({
      lastSentAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
      lastWindowStart: new Date(Date.now() - 25 * 60 * 60 * 1000),
    });
    (overviewNotificationDispatcher.sendDigestForTenant as jest.Mock).mockResolvedValue(3);

    const sent = await job.runForTenant('t1');
    expect(sent).toBe(3);
    expect(prisma.notificationDigestState.update).toHaveBeenCalled();
  });

  it('waits for weekly window when not elapsed', async () => {
    (getMerchantSettings as jest.Mock).mockResolvedValue({
      notificationPrefs: { frequency: 'weekly', weeklyDigest: { inApp: true, email: true } },
    });
    (prisma.notificationDigestState.upsert as jest.Mock).mockResolvedValue({
      lastSentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      lastWindowStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    });

    const sent = await job.runForTenant('t1');
    expect(sent).toBe(0);
    expect(overviewNotificationDispatcher.sendDigestForTenant).not.toHaveBeenCalled();
  });
});
