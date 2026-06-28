import { ProactiveLearningService } from '../ProactiveLearningService';

const learningEnabled = jest.fn(() => true);

jest.mock('../../proactiveConfig', () => ({
  isProactiveLearningEnabled: () => learningEnabled(),
  PROACTIVE_LEARNING_WINDOW_DAYS: 14,
}));

jest.mock('../../../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: jest.fn().mockResolvedValue({ brainAdaptiveLearningEnabled: true }),
}));

function makeBrain(snippets: string[]) {
  return {
    remember: jest.fn().mockResolvedValue(undefined),
    recall: jest.fn().mockResolvedValue({ snippets }),
  };
}

describe('ProactiveLearningService', () => {
  beforeEach(() => {
    learningEnabled.mockReturnValue(true);
    jest.clearAllMocks();
  });

  it('returns prefer_suppress after 3 dismisses', async () => {
    const now = new Date().toISOString();
    const snippets = Array.from({ length: 3 }, () =>
      JSON.stringify({
        action: 'dismissed',
        triggerId: 'inventory.low_stock',
        recordedAt: now,
      })
    );
    const brain = makeBrain(snippets);
    const registry = { get: jest.fn(() => brain) };
    const service = new ProactiveLearningService(registry as never);

    const pref = await service.getPreference('t1', 'inventory.low_stock', 'inventory');
    expect(pref).toBe('prefer_suppress');
    expect(await service.shouldSuppress('t1', 'inventory.low_stock', 'inventory')).toBe(true);
  });

  it('returns prefer_surface after 3 executes', async () => {
    const now = new Date().toISOString();
    const snippets = Array.from({ length: 3 }, () =>
      JSON.stringify({
        action: 'executed',
        triggerId: 'supplier.price_drop',
        recordedAt: now,
      })
    );
    const brain = makeBrain(snippets);
    const registry = { get: jest.fn(() => brain) };
    const service = new ProactiveLearningService(registry as never);

    expect(await service.getPriorityBoost('t1', 'supplier.price_drop')).toBe(1);
  });

  it('skips memory write when learning disabled', async () => {
    learningEnabled.mockReturnValue(false);
    const brain = makeBrain([]);
    const registry = { get: jest.fn(() => brain) };
    const service = new ProactiveLearningService(registry as never);

    await service.recordFeedback('t1', {
      action: 'dismissed',
      triggerId: 'inventory.low_stock',
    });
    expect(brain.remember).not.toHaveBeenCalled();
  });
});
