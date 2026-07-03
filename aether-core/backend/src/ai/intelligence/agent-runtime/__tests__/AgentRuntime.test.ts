import type { AgentRuntimePort } from '../AgentRuntimePort';
import { AgentRuntime } from '../AgentRuntime';
import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';
import type { CommandParserService } from '../../../../modules/admin-command-bar/application/services/CommandParserService';

describe('AgentRuntime', () => {
  it('uses injected contextSnippets instead of internal recall', async () => {
    const layer = createInMemoryIntelligenceLayer();
    const brain = layer.personalBrainRegistry.get('tenant_cmd', 'admin');
    await brain.remember({
      command: 'show inventory',
      intent: 'INVENTORY_STATUS',
      result: 'Inventory OK',
    });

    const mockParser = {
      parseCommand: jest.fn().mockResolvedValue({
        intent: 'INVENTORY_STATUS',
        action: 'query',
        parameters: {},
        confidence: 0.9,
      }),
      tryDetectCompound: jest.fn().mockResolvedValue(null),
    } as unknown as CommandParserService;

    const runtime = new AgentRuntime(layer.personalBrainRegistry, mockParser);
    const injected = ['[product] Test Product | price=10.00 EUR | stock=5'];

    const result = await runtime.processCommand({
      tenantId: 'tenant_cmd',
      command: 'inventory status',
      contextSnippets: injected,
    });

    expect(result.parsed.intent).toBe('INVENTORY_STATUS');
    expect(result.contextSnippets).toEqual(injected);
    expect(mockParser.parseCommand).toHaveBeenCalledWith(
      'inventory status',
      expect.objectContaining({ contextSnippets: injected })
    );
  });

  it('does not remember during parse phase', async () => {
    const layer = createInMemoryIntelligenceLayer();
    const brain = layer.personalBrainRegistry.get('tenant_no_remember', 'admin');
    const rememberSpy = jest.spyOn(brain, 'remember');

    const mockParser = {
      parseCommand: jest.fn().mockResolvedValue({
        intent: 'PRICE_UPDATE',
        action: 'raise',
        parameters: { percentage: 5 },
        confidence: 0.9,
      }),
      tryDetectCompound: jest.fn().mockResolvedValue(null),
    } as unknown as CommandParserService;

    const runtime = new AgentRuntime(layer.personalBrainRegistry, mockParser);
    await runtime.processCommand({
      tenantId: 'tenant_no_remember',
      command: 'verhoog prijs',
    });

    expect(rememberSpy).not.toHaveBeenCalled();
    rememberSpy.mockRestore();
  });

  it('falls back to internal recall when no contextSnippets injected', async () => {
    const layer = createInMemoryIntelligenceLayer();
    const brain = layer.personalBrainRegistry.get('tenant_recall', 'admin');
    await brain.remember({
      command: 'show inventory',
      intent: 'INVENTORY_STATUS',
      result: 'Inventory OK',
    });

    const mockParser = {
      parseCommand: jest.fn().mockResolvedValue({
        intent: 'INVENTORY_STATUS',
        confidence: 0.9,
        parameters: {},
      }),
      tryDetectCompound: jest.fn().mockResolvedValue(null),
    } as unknown as CommandParserService;

    const runtime = new AgentRuntime(layer.personalBrainRegistry, mockParser);
    const result = await runtime.processCommand({
      tenantId: 'tenant_recall',
      command: 'inventory status',
    });

    expect(result.contextSnippets.length).toBeGreaterThan(0);
  });
});

describe('AgentRuntimePort contract', () => {
  it('allows mock for command use case tests', async () => {
    const mock: AgentRuntimePort = {
      processCommand: jest.fn().mockResolvedValue({
        parsed: { intent: 'UNKNOWN', confidence: 0, parameters: {}, source: 'none' },
        contextSnippets: [],
      }),
    };
    const out = await mock.processCommand({ tenantId: 't', command: 'x' });
    expect(out.parsed.intent).toBe('UNKNOWN');
  });
});
