import { PersonalBrainMemoryService } from '../PersonalBrainMemoryService';
import { ExperienceReflectionService } from '../../reflection/ExperienceReflectionService';
import { createInMemoryIntelligenceLayer } from '../../../createIntelligenceLayer';

describe('PersonalBrainMemoryService', () => {
  let layer: ReturnType<typeof createInMemoryIntelligenceLayer>;
  let service: PersonalBrainMemoryService;

  beforeEach(() => {
    layer = createInMemoryIntelligenceLayer();
    service = new PersonalBrainMemoryService(layer.personalBrainRegistry);
    process.env.PERSONAL_BRAIN_MEMORY_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.PERSONAL_BRAIN_MEMORY_ENABLED;
  });

  it('records and recalls short-term memory', async () => {
    await service.clearShortTerm('tenant_mem');

    await service.recordOutcome({
      tenantId: 'tenant_mem',
      command: 'Verhoog prijzen voor earbuds met 5%',
      intent: 'PRICE_UPDATE',
      outcome: 'Prijzen verhoogd, marge +2.1%',
      success: true,
      confidence: 0.9,
      goalReached: true,
      verifiedUplift: 2.1,
    });

    const recall = await service.recallForCommand('tenant_mem', 'prijzen earbuds verhogen');
    expect(recall.entries.length).toBeGreaterThan(0);
    expect(recall.promptBlock).toContain('Relevante eerdere ervaringen');
    expect(recall.userNotice).toBeDefined();
    expect(recall.memoryRecalled.length).toBeGreaterThan(0);
  });

  it('returns brainMemoryId for undo compatibility', async () => {
    const id = await service.recordOutcome({
      tenantId: 'tenant_undo',
      command: 'Test undo',
      intent: 'PRICE_UPDATE',
      outcome: 'Done',
      success: true,
      confidence: 0.9,
      commandId: 'cmd_123',
    });
    expect(id).toBeTruthy();

    await service.removeByCommandId('tenant_undo', 'cmd_123');
    const brain = layer.personalBrainRegistry.get('tenant_undo', 'admin');
    if (id) {
      const recall = await brain.recall('[MEMORY]', 10);
      const found = recall.matches.some((m) => m.id === id);
      expect(found).toBe(false);
    }
  });

  it('stores long-term metadata on promoted memories', async () => {
    await service.recordOutcome({
      tenantId: 'tenant_lt',
      command: 'Verhoog alle prijzen',
      intent: 'PRICE_UPDATE',
      outcome: 'Marge verbeterd',
      success: true,
      confidence: 0.95,
      goalReached: true,
    });

    const brain = layer.personalBrainRegistry.get('tenant_lt', 'admin');
    const raw = await brain.recall('Verhoog alle prijzen', 10, {
      metadataFilter: { memoryType: ['episodic', 'semantic'] },
    });
    expect(raw.matches.length).toBeGreaterThan(0);
    expect(
      raw.matches.some((m) => m.metadata && (m.metadata as Record<string, unknown>).memoryType === 'episodic')
    ).toBe(true);

    const recall = await service.recallForCommand('tenant_lt', 'Verhoog alle prijzen');
    expect(recall.entries.some((e) => e.layer === 'long')).toBe(true);
    expect(recall.memoryRecalled.some((m) => m.kind === 'episodic')).toBe(true);
  });

  it('falls back when memory disabled', async () => {
    process.env.PERSONAL_BRAIN_MEMORY_ENABLED = 'false';
    const id = await service.recordOutcome({
      tenantId: 'tenant_off',
      command: 'Test',
      intent: 'UNKNOWN',
      outcome: 'ok',
      success: true,
      confidence: 0.5,
    });
    expect(id).toBeTruthy();
  });

  it('recalls stored experience reflections with reflection notice', async () => {
    const mockLlm = {
      model: 'test',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          goal: 'Verhoog marge',
          stepsTaken: ['Zoek producten'],
          outcome: 'Gelukt',
          wentWell: ['Snel'],
          couldImprove: [],
          futureLearnings: ['Check marges voor bulk updates'],
        })
      ),
    };
    const reflectionService = new ExperienceReflectionService(service.longTerm, mockLlm);

    await reflectionService.reflectAndStore({
      tenantId: 'tenant_refl_recall',
      command: 'Verhoog prijzen op earbuds',
      intent: 'PRICE_UPDATE',
      summary: {
        goalReached: true,
        completedSteps: [{ label: 'Zoek producten', tool: 'search_products' }],
        failedSteps: [],
        pendingApprovals: 0,
        narrative: 'Prijzen aangepast',
      },
      trigger: 'multi_step',
    });

    const recall = await service.recallForCommand('tenant_refl_recall', 'prijzen earbuds verhogen');
    expect(recall.promptBlock).toContain('Eerdere reflecties');
    expect(recall.reflectionNotice).toContain('vorige keer');
    expect(recall.memoryRecalled.some((m) => m.kind === 'reflection')).toBe(true);
  });
});
