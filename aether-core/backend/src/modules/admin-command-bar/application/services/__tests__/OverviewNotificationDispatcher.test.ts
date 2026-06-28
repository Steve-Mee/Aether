import { overviewNotificationDispatcher } from '../OverviewNotificationDispatcher';

jest.mock('../../../../../shared/prisma/client', () => ({
  prisma: {
    overviewFeedEvent: {
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn(),
    },
  },
}));

jest.mock('../../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn(),
}));

jest.mock('../../../../../modules/aether-mail/infrastructure/smtp/SmtpClient', () => ({
  smtpClient: { send: jest.fn().mockResolvedValue({ sent: true }) },
}));

jest.mock('../../../../../shared/notifications/resolveMerchantNotificationEmail', () => ({
  resolveMerchantNotificationEmail: jest.fn().mockResolvedValue('merchant@test.com'),
}));

const { getMerchantSettings } = jest.requireMock('../../../../../shared/settings/TenantSettingsService') as {
  getMerchantSettings: jest.Mock;
};
const { smtpClient } = jest.requireMock('../../../../../modules/aether-mail/infrastructure/smtp/SmtpClient') as {
  smtpClient: { send: jest.Mock };
};

describe('OverviewNotificationDispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.OVERVIEW_EMAIL_NOTIFICATIONS_ENABLED = 'true';
    getMerchantSettings.mockResolvedValue({
      notificationPrefs: {
        frequency: 'immediate',
        highRiskApproval: { email: true, inApp: true },
        autonomousLowRisk: { email: false, inApp: true },
        supplierChanges: { email: false, inApp: true },
        weeklyDigest: { email: true, inApp: true },
        proactiveSuggestions: { email: false, inApp: true },
      },
    });
  });

  it('sends immediate approval email when prefs allow', async () => {
    await overviewNotificationDispatcher.onFeedEventCreated('tenant-1', 'feed-1', {
      kind: 'approval',
      at: new Date().toISOString(),
      id: 'ap-1',
      cursor: '',
      payload: { status: 'pending', label: 'Price change' },
    });
    expect(smtpClient.send).toHaveBeenCalledTimes(1);
  });

  it('skips when frequency is weekly', async () => {
    getMerchantSettings.mockResolvedValue({
      notificationPrefs: {
        frequency: 'weekly',
        highRiskApproval: { email: true, inApp: true },
        weeklyDigest: { email: true, inApp: true },
      },
    });
    await overviewNotificationDispatcher.onFeedEventCreated('tenant-1', 'feed-1', {
      kind: 'approval',
      at: new Date().toISOString(),
      id: 'ap-1',
      cursor: '',
      payload: { status: 'pending' },
    });
    expect(smtpClient.send).not.toHaveBeenCalled();
  });
});
