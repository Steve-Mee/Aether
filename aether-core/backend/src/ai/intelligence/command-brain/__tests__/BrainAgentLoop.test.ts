import { BrainAgentLoop } from '../BrainAgentLoop';
import { PersonalBrainToolRegistry } from '../../personal-brain/tools/PersonalBrainToolRegistry';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';

describe('BrainAgentLoop', () => {
  const layer = createInMemoryIntelligenceLayer();

  beforeEach(() => {
    process.env.COMMAND_BRAIN_PLANNING_ENABLED = 'false';
  });

  afterEach(() => {
    delete process.env.COMMAND_BRAIN_PLANNING_ENABLED;
  });

  const mockAdminData: AdminDataPort = {
    countProducts: jest.fn(),
    countLowMarginProducts: jest.fn(),
    updateProductPrices: jest.fn(),
    updateProductPricesByIds: jest.fn(),
    restoreProductPrices: jest.fn(),
    listInventoryItems: jest.fn(),
    listRecentOrders: jest.fn(),
    countEmailsByStatus: jest.fn(),
    countOutcomesByStatus: jest.fn(),
    countForecasts: jest.fn(),
    countPendingApprovals: jest.fn(),
    listPendingApprovals: jest.fn(),
    approveLowRisk: jest.fn(),
    createSupplier: jest.fn(),
    listSuppliers: jest.fn(),
    findLatestProposedOutcome: jest.fn(),
    countRecentCommands: jest.fn(),
    listLowStockInventory: jest.fn(),
    listProductsForBrain: jest.fn(),
    searchProductsByName: jest.fn().mockResolvedValue([
      { id: 'p1', name: 'Wireless Earbuds Pro', price: 49.99, stock: 85, slug: 'wireless-earbuds-pro' },
    ]),
  };

  it('runs tool loop and returns final narrative', async () => {
    const tools = new PersonalBrainToolRegistry({
      adminData: mockAdminData,
      personalBrains: layer.personalBrainRegistry,
    });
    let callCount = 0;
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockImplementation(async () => {
        callCount += 1;
        if (callCount === 1) {
          return JSON.stringify({ tool: 'search_products', input: { query: 'Wireless Earbuds' } });
        }
        return JSON.stringify({
          final: { narrative: 'Voorstel voor Wireless Earbuds Pro.', actionProposal: 'Monitor marge.' },
        });
      }),
    };

    const loop = new BrainAgentLoop(tools, mockLlm);
    const result = await loop.run({
      tenantId: 'tenant_agent',
      command: 'Optimaliseer prijzen voor Wireless Earbuds',
      parsedIntent: 'PRICE_UPDATE',
      parameters: { percentage: 5 },
      contextSnippets: [],
      handlerResult: 'Updated 1 product',
      persistRun: false,
    });

    expect(result.narrative).toContain('Wireless Earbuds');
    expect(result.toolTrace?.length).toBe(1);
    expect(result.toolTrace![0].tool).toBe('search_products');
  });

  it('falls back to handlerResult after max steps', async () => {
    const tools = new PersonalBrainToolRegistry({
      adminData: mockAdminData,
      personalBrains: layer.personalBrainRegistry,
    });
    const mockLlm: LlmInferencePort = {
      model: 'test',
      generate: jest.fn().mockResolvedValue(JSON.stringify({ tool: 'recall_memory', input: { query: 'x' } })),
    };

    const loop = new BrainAgentLoop(tools, mockLlm);
    const result = await loop.run({
      tenantId: 'tenant_agent',
      command: 'test',
      parsedIntent: 'UNKNOWN',
      parameters: {},
      contextSnippets: [],
      handlerResult: 'Fallback result',
      persistRun: false,
    });

    expect(result.narrative).toBe('Fallback result');
    expect(result.toolTrace!.length).toBeGreaterThan(0);
  });
});
