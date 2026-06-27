import { AgentRuntime } from '../AgentRuntime';
import { PersonalBrainRegistry } from '../../personal-brain/PersonalBrainRegistry';
import { InMemoryVectorStoreAdapter } from '../../vector-store/adapters/InMemoryVectorStoreAdapter';
import { SimpleHashEmbeddingAdapter } from '../../vector-store/SimpleHashEmbeddingAdapter';
import { InMemoryLoRAAdapter } from '../../personal-brain/InMemoryLoRAAdapter';
import { InMemoryAgentStateAdapter } from '../../personal-brain/PrismaAgentStateAdapter';
import type { CommandParserService } from '../../../../modules/admin-command-bar/application/services/CommandParserService';

describe('AgentRuntime compound', () => {
  const registry = new PersonalBrainRegistry(
    new InMemoryVectorStoreAdapter(),
    new SimpleHashEmbeddingAdapter(),
    new InMemoryLoRAAdapter(),
    new InMemoryAgentStateAdapter()
  );

  const mockParser = {
    parseCommand: jest
      .fn()
      .mockResolvedValueOnce({
        intent: 'PRICE_UPDATE',
        action: 'raise',
        parameters: { percentage: 5 },
        confidence: 0.9,
      })
      .mockResolvedValueOnce({
        intent: 'SUPPLIER_MONITOR',
        action: null,
        parameters: {},
        confidence: 0.85,
      }),
  } as unknown as CommandParserService;

  const runtime = new AgentRuntime(registry, mockParser);

  beforeEach(() => {
    process.env.COMMAND_BRAIN_COMPOUND_ENABLED = 'true';
  });

  afterEach(() => {
    delete process.env.COMMAND_BRAIN_COMPOUND_ENABLED;
  });

  it('detects compound workflow and parses sub-steps', async () => {
    const result = await runtime.processCommand({
      tenantId: 'tenant_compound',
      command: 'Verhoog prijzen en daarna sync Nordic',
    });

    expect(result.parsed.intent).toBe('COMPOUND_WORKFLOW');
    expect(result.parsed.compound?.steps).toHaveLength(2);
    expect(result.parsed.compound?.steps[0].intent).toBe('PRICE_UPDATE');
    expect(result.parsed.compound?.steps[1].intent).toBe('SUPPLIER_MONITOR');
  });
});
