import { ExperienceReflectionService, formatReflectionSummary } from '../ExperienceReflectionService';
import { LongTermMemoryStore } from '../../memory/LongTermMemoryStore';
import { createInMemoryIntelligenceLayer } from '../../../createIntelligenceLayer';
import type { LlmInferencePort } from '../../../../../shared/ai/LlmInferencePort';
import { buildAgentRunSummary } from '../../../command-brain/types/AgentPlan';

describe('ExperienceReflectionService', () => {
  let layer: ReturnType<typeof createInMemoryIntelligenceLayer>;
  let longTerm: LongTermMemoryStore;

  beforeEach(() => {
    layer = createInMemoryIntelligenceLayer();
    longTerm = new LongTermMemoryStore(layer.personalBrainRegistry);
    process.env.PERSONAL_BRAIN_EXPERIENCE_REFLECTION_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.PERSONAL_BRAIN_EXPERIENCE_REFLECTION_ENABLED;
  });

  it('formats reflection summary for storage', () => {
    const summary = formatReflectionSummary({
      goal: 'Verhoog marge',
      stepsTaken: ['Zoek producten', 'Pas prijzen aan'],
      outcome: 'Marge +2%',
      wentWell: ['Snelle uitvoering'],
      couldImprove: ['Meer validatie'],
      futureLearnings: ['Check marges voor bulk updates'],
      trigger: 'multi_step',
      success: true,
      intent: 'PRICE_UPDATE',
      command: 'Verhoog prijzen',
    });
    expect(summary).toContain('Doel: Verhoog marge');
    expect(summary).toContain('Leerpunt:');
  });

  it('reflectAndStore persists structured reflection memory', async () => {
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          goal: 'Verhoog marge',
          stepsTaken: ['Zoek producten'],
          outcome: 'Gelukt',
          wentWell: ['Snel'],
          couldImprove: ['Validatie'],
          futureLearnings: ['Bulk check marges'],
        })
      ),
    };

    const service = new ExperienceReflectionService(longTerm, mockLlm);
    const summary = buildAgentRunSummary({
      plan: { goal: 'Verhoog marge', steps: [{ index: 1, label: 'Zoek producten' }] },
      toolTrace: [{ tool: 'search_products' }, { tool: 'update_prices' }],
      pendingActions: [],
      narrative: 'Prijzen aangepast',
      goalReached: true,
    });

    const result = await service.reflectAndStore({
      tenantId: 'tenant_ref',
      command: 'Verhoog prijzen op earbuds',
      intent: 'PRICE_UPDATE',
      summary,
      trigger: 'multi_step',
      toolTrace: [{ tool: 'search_products' }, { tool: 'update_prices' }],
    });

    expect(result).not.toBeNull();
    expect(result!.memoryIds.length).toBe(1);
    expect(result!.reflection.futureLearnings).toContain('Bulk check marges');

    const brain = layer.personalBrainRegistry.get('tenant_ref', 'admin');
    const raw = await brain.recall('Verhoog prijzen', 5, {
      metadataFilter: { memoryType: ['reflection'] },
      minScore: -1,
    });
    expect(raw.matches.length).toBeGreaterThan(0);
    expect((raw.matches[0].metadata as Record<string, unknown>).memoryType).toBe('reflection');
  });
});
