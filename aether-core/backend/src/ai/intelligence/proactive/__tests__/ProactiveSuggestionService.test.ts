import { ProactiveSuggestionService } from '../ProactiveSuggestionService';
import type { ProactiveFinding } from '../ProactiveTriggerDefinition';
import { DEFAULT_MERCHANT_SETTINGS } from '../../../../shared/settings/merchantSettingsTypes';

jest.mock('../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn().mockResolvedValue({
    ...require('../../../../shared/settings/merchantSettingsTypes').DEFAULT_MERCHANT_SETTINGS,
    proactivePrefs: {
      ...require('../../../../shared/settings/merchantSettingsTypes').DEFAULT_PROACTIVE_PREFS,
      enabled: true,
      visibility: 'all',
    },
  }),
}));

jest.mock('../../explainability/ExplainabilityPersister', () => ({
  explainabilityPersister: {
    listSourceIdsWithSnapshots: jest.fn().mockResolvedValue(new Set()),
    getSnapshot: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../proactiveConfig', () => ({
  isProactiveBrainEnabled: () => true,
  isProactiveSseEnabled: () => false,
}));

jest.mock('../ProactiveSuggestionEmitter', () => ({
  proactiveSuggestionEmitter: { emit: jest.fn() },
}));

describe('ProactiveSuggestionService', () => {
  const finding: ProactiveFinding = {
    triggerId: 'inventory.low_stock',
    dedupeKey: 'inventory.low_stock:test',
    agentKey: 'inventory',
    title: 'Low stock',
    command: 'Check stock',
    intentId: 'RESTOCK_SUGGEST',
    category: 'voorraad',
    riskLevel: 'low',
    executionMode: 'autonomous',
    priority: 8,
    evidence: { lowStockCount: 3 },
  };

  const repository = {
    upsertFinding: jest.fn().mockResolvedValue({
      record: { id: 's1', ...finding, status: 'active' },
      created: true,
    }),
    listActive: jest.fn(),
    expireStale: jest.fn().mockResolvedValue(0),
    dismiss: jest.fn(),
    snooze: jest.fn(),
    markExecuted: jest.fn(),
    findById: jest.fn(),
    countActive: jest.fn().mockResolvedValue(1),
  };

  const learning = {
    shouldSuppress: jest.fn().mockResolvedValue(false),
    getPriorityBoost: jest.fn().mockResolvedValue(0),
    getExtendedCooldownMs: jest.fn().mockResolvedValue(24 * 60 * 60 * 1000),
    recordFeedback: jest.fn(),
  };

  const dedupe = {
    normalize: jest.fn((findings: ProactiveFinding[]) => findings),
    mergeActive: jest.fn((records: unknown[]) => records),
  };

  const adminData = {} as never;
  const service = new ProactiveSuggestionService(repository as never, adminData, undefined, {
    dedupe: dedupe as never,
    learning: learning as never,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('ingests findings when enabled', async () => {
    const count = await service.ingestFindings('tenant-1', [finding]);
    expect(count).toBe(1);
    expect(repository.upsertFinding).toHaveBeenCalled();
  });

  it('maps records to DTOs', async () => {
    repository.listActive.mockResolvedValue([
      {
        id: 's1',
        tenantId: 'tenant-1',
        triggerId: finding.triggerId,
        dedupeKey: finding.dedupeKey,
        agentKey: 'inventory',
        title: finding.title,
        summary: null,
        command: finding.command,
        intentId: finding.intentId,
        category: finding.category,
        riskLevel: finding.riskLevel,
        executionMode: finding.executionMode,
        status: 'active',
        snoozedUntil: null,
        evidence: finding.evidence,
        priority: finding.priority,
        expiresAt: null,
        goalId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
    const dtos = await service.listActiveDtos('tenant-1');
    expect(dtos[0]?.source).toBe('proactive');
    expect(dtos[0]?.label).toBe(finding.title);
  });
});
