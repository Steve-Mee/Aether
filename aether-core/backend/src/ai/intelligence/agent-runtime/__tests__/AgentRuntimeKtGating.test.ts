import { AgentRuntime } from '../AgentRuntime';
import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';
import type { CommandParserService } from '../../../../modules/admin-command-bar/application/services/CommandParserService';
import type { KnowledgeTransferGatePort } from '../../knowledge-transfer/KnowledgeTransferGatePort';
import type { GlobalBrainPort } from '../../global-brain/GlobalBrainPort';

describe('AgentRuntime KT gating', () => {
  it('skips collective snippets when knowledge transfer gate is disabled', async () => {
    const layer = createInMemoryIntelligenceLayer();

    const mockGlobalBrain: GlobalBrainPort = {
      getCollectiveInsights: jest.fn().mockResolvedValue([
        { category: 'pricing', summary: 'Secret collective insight' },
      ]),
    };

    const mockKtGate: KnowledgeTransferGatePort = {
      isEnabled: jest.fn().mockResolvedValue(false),
    };

    const mockParser = {
      parseCommand: jest.fn().mockResolvedValue({
        intent: 'PRICE_UPDATE',
        confidence: 0.9,
        parameters: {},
      }),
      tryDetectCompound: jest.fn().mockResolvedValue(null),
    } as unknown as CommandParserService;

    const runtime = new AgentRuntime(
      layer.personalBrainRegistry,
      mockParser,
      mockGlobalBrain,
      layer.knowledgeTransfer,
      mockKtGate
    );

    await runtime.processCommand({ tenantId: 'tenant_kt_off', command: 'verhoog prijs' });

    expect(mockGlobalBrain.getCollectiveInsights).not.toHaveBeenCalled();
    expect(mockParser.parseCommand).toHaveBeenCalledWith(
      'verhoog prijs',
      expect.objectContaining({ collectiveSnippets: [] })
    );
  });
});
