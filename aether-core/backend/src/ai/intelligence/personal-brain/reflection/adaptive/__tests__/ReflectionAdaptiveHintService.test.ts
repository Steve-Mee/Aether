import { ReflectionAdaptiveHintService } from '../ReflectionAdaptiveHintService';
import { LongTermMemoryStore } from '../../../memory/LongTermMemoryStore';
import { createInMemoryIntelligenceLayer } from '../../../../createIntelligenceLayer';
import { ExperienceReflectionService } from '../../ExperienceReflectionService';

describe('ReflectionAdaptiveHintService', () => {
  let layer: ReturnType<typeof createInMemoryIntelligenceLayer>;
  let longTerm: LongTermMemoryStore;
  let service: ReflectionAdaptiveHintService;

  beforeEach(() => {
    layer = createInMemoryIntelligenceLayer();
    longTerm = new LongTermMemoryStore(layer.personalBrainRegistry);
    service = new ReflectionAdaptiveHintService(longTerm);
    process.env.PERSONAL_BRAIN_REFLECTION_ADAPTIVE_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.PERSONAL_BRAIN_REFLECTION_ADAPTIVE_ENABLED;
  });

  it('returns preferConfirm for failure reflections on matching tool', async () => {
    const reflectionService = new ExperienceReflectionService(longTerm, {
      model: 'test',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          goal: 'Test',
          stepsTaken: ['stap'],
          outcome: 'Mislukt',
          wentWell: [],
          couldImprove: ['Valideer marges eerst'],
          futureLearnings: ['Check marges'],
        })
      ),
    });

    await reflectionService.reflectAndStore({
      tenantId: 'tenant_adaptive',
      command: 'Verhoog prijzen',
      intent: 'PRICE_UPDATE',
      summary: {
        goalReached: false,
        completedSteps: [{ label: 'update', tool: 'updatePrice' }],
        failedSteps: [],
        pendingApprovals: 0,
        narrative: 'Mislukt',
      },
      trigger: 'failure',
      toolTrace: [{ tool: 'updatePrice' }],
    });

    const hints = await service.getHintsFromReflections('tenant_adaptive', {
      tool: 'updatePrice',
      intent: 'PRICE_UPDATE',
    });

    expect(hints?.preferConfirm).toBe(true);
    expect(hints?.hints.length).toBeGreaterThan(0);
  });
});
