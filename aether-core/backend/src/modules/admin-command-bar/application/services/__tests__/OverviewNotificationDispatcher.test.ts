import { OverviewNotificationDispatcher } from '../OverviewNotificationDispatcher';
import type { OverviewFeedPort } from '../../ports/OverviewFeedPort';
import type { MailSenderPort } from '../../../../aether-mail/application/ports/MailSenderPort';

jest.mock('../../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn(),
}));

jest.mock('../../../../../shared/notifications/resolveMerchantNotificationEmail', () => ({
  resolveMerchantNotificationEmail: jest.fn().mockResolvedValue('merchant@test.com'),
}));

const { getMerchantSettings } = jest.requireMock('../../../../../shared/settings/TenantSettingsService') as {
  getMerchantSettings: jest.Mock;
};

describe('OverviewNotificationDispatcher', () => {
  const overviewFeedPort: jest.Mocked<OverviewFeedPort> = {
    findFeedEvents: jest.fn(),
    countFeedEvents: jest.fn(),
    findFeedEventsSince: jest.fn(),
    findFeedEventsByKinds: jest.fn(),
    upsertFeedEvent: jest.fn(),
    markEmailDispatched: jest.fn(),
    markManyEmailDispatched: jest.fn(),
    findUndispatchedForDigest: jest.fn(),
    countActiveProactiveSuggestions: jest.fn(),
    countActiveGoals: jest.fn(),
    findPendingApprovals: jest.fn(),
    findApprovalsSince: jest.fn(),
    findActiveGoals: jest.fn(),
    findActiveGoalsUpdatedSince: jest.fn(),
    findActiveProactiveSuggestions: jest.fn(),
    findActiveProactiveForInbox: jest.fn(),
  };
  const mailSender: jest.Mocked<MailSenderPort> = {
    isConfigured: jest.fn(),
    send: jest.fn().mockResolvedValue({ sent: true }),
  };
  const dispatcher = new OverviewNotificationDispatcher(overviewFeedPort, mailSender);

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
    await dispatcher.onFeedEventCreated('tenant-1', 'feed-1', {
      kind: 'approval',
      at: new Date().toISOString(),
      id: 'ap-1',
      cursor: '',
      payload: { status: 'pending', label: 'Price change' },
    });
    expect(mailSender.send).toHaveBeenCalledTimes(1);
  });

  it('skips when frequency is weekly', async () => {
    getMerchantSettings.mockResolvedValue({
      notificationPrefs: {
        frequency: 'weekly',
        highRiskApproval: { email: true, inApp: true },
        weeklyDigest: { email: true, inApp: true },
      },
    });
    await dispatcher.onFeedEventCreated('tenant-1', 'feed-1', {
      kind: 'approval',
      at: new Date().toISOString(),
      id: 'ap-1',
      cursor: '',
      payload: { status: 'pending' },
    });
    expect(mailSender.send).not.toHaveBeenCalled();
  });
});
