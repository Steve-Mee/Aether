import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';
import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { CommandBrainService } from '../CommandBrainService';
import { MerchantKnowledgeIndexer } from '../../merchant-knowledge/MerchantKnowledgeIndexer';
import { ExecuteNaturalLanguageCommandUseCase } from '../../../../modules/admin-command-bar/application/use-cases/ExecuteNaturalLanguageCommandUseCase';
import type { SupplierMonitorPort } from '../../../../modules/admin-command-bar/application/ports/SupplierMonitorPort';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import { ContextRetriever } from '../../retrieval/ContextRetriever';
import { BrainResponseService } from '../BrainResponseService';

jest.mock('../../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../ai/orchestrator/Orchestrator', () => ({
  orchestrator: { execute: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('../../../../ai/attribution/OutcomeEngine', () => ({
  computeIncrementalRevenueUplift: jest.fn().mockResolvedValue(0),
}));

jest.mock('../../../../ai/orchestrator/WorkflowEngine', () => ({
  workflowEngine: {
    startRun: jest.fn().mockResolvedValue('run_rag'),
    addStep: jest.fn().mockResolvedValue(undefined),
  },
}));

describe('Command Bar brain RAG integration', () => {
  const mockSupplierMonitor: SupplierMonitorPort = {
    monitorSupplier: jest.fn().mockResolvedValue({ changeCount: 0 }),
  };

  const mockCommandLog = {
    save: jest.fn().mockResolvedValue({ id: 'cmd_rag_1' }),
    findRecent: jest.fn(),
    findById: jest.fn(),
    updateResult: jest.fn(),
    updateBrainMemoryId: jest.fn(),
    findForUndo: jest.fn(),
    markReverted: jest.fn(),
  };

  const mockAdminData: AdminDataPort = {
    countProducts: jest.fn(),
    countLowMarginProducts: jest.fn(),
    updateProductPrices: jest.fn(),
    updateProductPricesByIds: jest.fn().mockResolvedValue(1),
    listInventoryItems: jest.fn(),
    listRecentOrders: jest.fn(),
    countEmailsByStatus: jest.fn(),
    countOutcomesByStatus: jest.fn(),
    countForecasts: jest.fn(),
    countPendingApprovals: jest.fn(),
    listPendingApprovals: jest.fn(),
    approveLowRisk: jest.fn(),
    createSupplier: jest.fn(),
    createProduct: jest.fn(),
    listSuppliers: jest.fn(),
    findLatestProposedOutcome: jest.fn(),
    countRecentCommands: jest.fn(),
    listLowStockInventory: jest.fn(),
    listProductsForBrain: jest.fn().mockResolvedValue([
      {
        id: 'prod_earbuds',
        name: 'Wireless Earbuds Pro',
        price: 49.99,
        stock: 85,
        slug: 'wireless-earbuds-pro',
      },
    ]),
    searchProductsByName: jest.fn().mockResolvedValue([
      {
        id: 'prod_earbuds',
        name: 'Wireless Earbuds Pro',
        price: 49.99,
        stock: 85,
        slug: 'wireless-earbuds-pro',
      },
    ]),
    restoreProductPrices: jest.fn(),
  } as unknown as AdminDataPort;

  it('indexes products and returns brain context for Wireless Earbuds command', async () => {
    const layer = createInMemoryIntelligenceLayer();
    const mockParserLlm: LlmInferencePort = {
      model: 'test-parser',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          intent: 'PRICE_UPDATE',
          action: 'raise',
          parameters: { percentage: 5, product: 'Wireless Earbuds' },
          confidence: 0.9,
        })
      ),
    };
    const mockResponseLlm: LlmInferencePort = {
      model: 'test-response',
      generate: jest.fn().mockResolvedValue(
        JSON.stringify({
          narrative: 'Wireless Earbuds Pro: prijsoptimalisatie van 5% uitgevoerd op basis van €49,99 en 85 stuks voorraad.',
          actionProposal: 'Controleer marge na 7 dagen.',
        })
      ),
    };

    const { CommandParserService } = await import(
      '../../../../modules/admin-command-bar/application/services/CommandParserService'
    );
    const { AgentRuntime } = await import('../../agent-runtime/AgentRuntime');

    const parser = new CommandParserService(mockParserLlm);
    const agentRuntime = new AgentRuntime(layer.personalBrainRegistry, parser);
    const indexer = new MerchantKnowledgeIndexer(layer.personalBrainRegistry, mockAdminData);
    const retriever = new ContextRetriever(layer.personalBrainRegistry, mockAdminData);
    const commandBrain = new CommandBrainService(indexer, retriever, mockAdminData);
    const brainResponse = new BrainResponseService(mockResponseLlm);

    const useCase = new ExecuteNaturalLanguageCommandUseCase(
      mockSupplierMonitor,
      mockAdminData,
      mockCommandLog,
      {
        agentRuntime,
        commandBrain,
        brainResponse,
        personalBrainRegistry: layer.personalBrainRegistry,
      }
    );

    const result = await useCase.execute('Optimaliseer prijzen voor Wireless Earbuds', {
      tenantId: 'tenant_rag',
    });

    expect(result.parsedIntent).toBe('PRICE_UPDATE');
    expect(result.brain).toBeDefined();
    expect(result.brain!.contextSnippets.some((s) => s.includes('Wireless Earbuds Pro'))).toBe(true);
    expect(result.brain!.recallCount).toBeGreaterThan(0);
    expect(result.result).toContain('Wireless Earbuds');
    expect(mockAdminData.updateProductPricesByIds).toHaveBeenCalled();
  });
});
