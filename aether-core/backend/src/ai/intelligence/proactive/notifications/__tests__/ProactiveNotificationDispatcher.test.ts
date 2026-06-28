import { ProactiveNotificationDispatcher } from '../ProactiveNotificationDispatcher';

jest.mock('../../proactiveConfig', () => ({
  isProactiveEmailNotificationsEnabled: jest.fn(() => false),
  resolveProactiveEmailMaxPerHour: jest.fn(() => 1),
}));

jest.mock('../../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn().mockResolvedValue({
    proactivePrefs: { enabled: true, visibility: 'all' },
    notificationPrefs: {
      proactiveSuggestions: { inApp: true, email: true },
      frequency: 'immediate',
    },
  }),
}));

describe('ProactiveNotificationDispatcher', () => {
  it('skips email when feature flag disabled', async () => {
    const dispatcher = new ProactiveNotificationDispatcher();
    await expect(
      dispatcher.notifyCreated('t1', {
        id: 's1',
        tenantId: 't1',
        triggerId: 'inventory.low_stock',
        dedupeKey: 'k',
        agentKey: 'inventory',
        title: 'Low stock',
        summary: null,
        command: 'Check',
        intentId: 'RESTOCK_SUGGEST',
        category: 'voorraad',
        riskLevel: 'low',
        executionMode: 'autonomous',
        status: 'active',
        snoozedUntil: null,
        evidence: {},
        priority: 8,
        expiresAt: null,
        clusterKey: null,
        enrichedAt: null,
        enrichmentSource: null,
        detectionRunId: null,
        orchestrationSource: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    ).resolves.toBeUndefined();
  });
});
