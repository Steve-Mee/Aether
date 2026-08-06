import { createInMemoryIntelligenceLayer } from '../../../createIntelligenceLayer';

describe('strategic memory recall wiring', () => {
  it('PersonalBrainMemoryService exposes strategicMemory and uses it during recall', async () => {
    process.env.PERSONAL_BRAIN_MEMORY_ENABLED = 'true';
    process.env.PERSONAL_BRAIN_STRATEGIC_MEMORY_ENABLED = 'true';

    const layer = createInMemoryIntelligenceLayer();
    const memory = layer.personalBrainMemory;

    expect(memory.strategicMemory).toBeDefined();
    expect(memory.strategicReflection).toBeDefined();

    const remember = jest.spyOn(memory.strategicMemory, 'recallStrategies').mockResolvedValue([
      {
        id: 's1',
        strategy: 'bundle upsell',
        context: 'growing demand',
        outcome: 'success',
        score: 0.9,
      },
    ]);
    jest.spyOn(memory.strategicMemory, 'recallHighImpactActions').mockResolvedValue([]);
    jest.spyOn(memory.strategicMemory, 'recallMerchantPatterns').mockResolvedValue([]);

    await memory.recallForCommand('tenant_test', 'plan marketing campaign');
    expect(remember).toHaveBeenCalled();

    delete process.env.PERSONAL_BRAIN_MEMORY_ENABLED;
    delete process.env.PERSONAL_BRAIN_STRATEGIC_MEMORY_ENABLED;
  });
});
