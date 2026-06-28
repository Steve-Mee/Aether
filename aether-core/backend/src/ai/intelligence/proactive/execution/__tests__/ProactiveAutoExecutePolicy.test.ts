import { DEFAULT_PROACTIVE_PREFS } from '../../../../../shared/settings/merchantSettingsTypes';
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

const openSettings = {
  proactivePrefs: { ...DEFAULT_PROACTIVE_PREFS, allowAutoExecute: true },
  policyEnabled: true,
  autoApproveLowRisk: true,
  autoRunWindow: 'always' as const,
  autoRunWindowStart: '00:00',
  autoRunWindowEnd: '23:59',
  autonomyLevel: 'medium' as const,
};

describe('shouldProactiveAutoExecute', () => {
  beforeEach(() => {
    isProactiveAutoExecuteEnabled.mockReturnValue(true);
  });

  it('allows eligible low-risk autonomous suggestion', () => {
    const result = shouldProactiveAutoExecute({
      settings: openSettings as never,
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
      } as never,
      record: baseRecord,
      learningPref: null,
      cooldownMs: 4 * 60 * 60 * 1000,
    });
    expect(result.eligible).toBe(false);
  });

  it('blocks high-risk suggestions', () => {
    const result = shouldProactiveAutoExecute({
      settings: openSettings as never,
      record: { ...baseRecord, riskLevel: 'high', executionMode: 'approval_required' },
      learningPref: null,
      cooldownMs: 4 * 60 * 60 * 1000,
    });
    expect(result.eligible).toBe(false);
  });

  it('blocks when learning prefers suppress', () => {
    const result = shouldProactiveAutoExecute({
      settings: openSettings as never,
      record: baseRecord,
      learningPref: 'prefer_suppress',
      cooldownMs: 4 * 60 * 60 * 1000,
    });
    expect(result.eligible).toBe(false);
  });

  it('blocks during cooldown', () => {
    const result = shouldProactiveAutoExecute({
      settings: openSettings as never,
      record: baseRecord,
      learningPref: null,
      lastAutoExecuteAt: new Date(),
      cooldownMs: 4 * 60 * 60 * 1000,
    });
    expect(result.eligible).toBe(false);
  });
});
