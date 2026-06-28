import { DEFAULT_PROACTIVE_PREFS, DEFAULT_MERCHANT_SETTINGS, type MerchantSettings } from '../../../../../shared/settings/merchantSettingsTypes';
import { shouldProactiveAutoExecute } from '../ProactiveAutoExecutePolicy';

jest.mock('../../proactiveConfig', () => ({
  isProactiveAutoExecuteEnabled: jest.fn(() => true),
}));

const { isProactiveAutoExecuteEnabled } = jest.requireMock('../../proactiveConfig');

const baseRecord = {
  id: 's1',
  tenantId: 't1',
  triggerId: 'inventory.low_stock',
  dedupeKey: 'k',
  agentKey: 'inventory',
  title: 'Low stock',
  summary: null,
  command: 'Check stock',
  intentId: 'RESTOCK_SUGGEST',
  category: 'voorraad',
  riskLevel: 'low' as const,
  executionMode: 'autonomous' as const,
  status: 'active',
  snoozedUntil: null,
  evidence: {},
  priority: 8,
  clusterKey: null,
  enrichedAt: null,
  enrichmentSource: null,
  detectionRunId: null,
  orchestrationSource: null,
  expiresAt: null,
  goalId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const openSettings: MerchantSettings = {
  ...DEFAULT_MERCHANT_SETTINGS,
  proactivePrefs: { ...DEFAULT_PROACTIVE_PREFS, allowAutoExecute: true },
  policyEnabled: true,
  autoApproveLowRisk: true,
  autoRunWindow: 'always',
  autonomyPrefs: {
    ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs,
    actionCategories: {
      ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories,
      inventory: {
        ...DEFAULT_MERCHANT_SETTINGS.autonomyPrefs.actionCategories.inventory,
        allowLowRiskAutoExecute: true,
      },
    },
  },
};

describe('shouldProactiveAutoExecute', () => {
  beforeEach(() => {
    isProactiveAutoExecuteEnabled.mockReturnValue(true);
  });

  it('allows eligible low-risk autonomous suggestion', () => {
    const result = shouldProactiveAutoExecute({
      settings: openSettings,
      record: baseRecord,
      learningPref: null,
      cooldownMs: 4 * 60 * 60 * 1000,
    });
    expect(result.eligible).toBe(true);
  });

  it('blocks when merchant has not enabled auto-execute', () => {
    const result = shouldProactiveAutoExecute({
      settings: {
        ...openSettings,
        proactivePrefs: { ...DEFAULT_PROACTIVE_PREFS, allowAutoExecute: false },
      } as MerchantSettings,
      record: baseRecord,
      learningPref: null,
      cooldownMs: 4 * 60 * 60 * 1000,
    });
    expect(result.eligible).toBe(false);
  });

  it('blocks high-risk suggestions', () => {
    const result = shouldProactiveAutoExecute({
      settings: openSettings,
      record: { ...baseRecord, riskLevel: 'high', executionMode: 'approval_required' },
      learningPref: null,
      cooldownMs: 4 * 60 * 60 * 1000,
    });
    expect(result.eligible).toBe(false);
  });

  it('blocks when learning prefers suppress', () => {
    const result = shouldProactiveAutoExecute({
      settings: openSettings,
      record: baseRecord,
      learningPref: 'prefer_suppress',
      cooldownMs: 4 * 60 * 60 * 1000,
    });
    expect(result.eligible).toBe(false);
  });

  it('blocks during cooldown', () => {
    const result = shouldProactiveAutoExecute({
      settings: openSettings,
      record: baseRecord,
      learningPref: null,
      lastAutoExecuteAt: new Date(),
      cooldownMs: 4 * 60 * 60 * 1000,
    });
    expect(result.eligible).toBe(false);
  });
});
