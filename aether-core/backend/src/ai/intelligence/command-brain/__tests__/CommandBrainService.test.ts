import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';
import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { CommandBrainService } from '../CommandBrainService';
import { MerchantKnowledgeIndexer } from '../../merchant-knowledge/MerchantKnowledgeIndexer';
import { ContextRetriever } from '../../retrieval/ContextRetriever';

describe('CommandBrainService', () => {
  const layer = createInMemoryIntelligenceLayer();

  const mockAdminData: AdminDataPort = {
    countProducts: jest.fn(),
    countLowMarginProducts: jest.fn(),
    updateProductPrices: jest.fn(),
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
    searchProductsByName: jest.fn().mockImplementation((_tid, query) => {
      if (query.toLowerCase().includes('earbuds') || query.toLowerCase().includes('wireless')) {
        return Promise.resolve([
          {
            id: 'prod_earbuds',
            name: 'Wireless Earbuds Pro',
            price: 49.99,
            stock: 85,
            slug: 'wireless-earbuds-pro',
          },
        ]);
      }
      return Promise.resolve([]);
    }),
    updateProductPricesByIds: jest.fn(),
    restoreProductPrices: jest.fn(),
  } as unknown as AdminDataPort;

  const indexer = new MerchantKnowledgeIndexer(layer.personalBrainRegistry, mockAdminData);
  const retriever = new ContextRetriever(layer.personalBrainRegistry, mockAdminData);
  const service = new CommandBrainService(indexer, retriever, mockAdminData);

  it('returns hybrid context with keyword product hits and vector recall', async () => {
    const brain = layer.personalBrainRegistry.get('tenant_hybrid', 'admin');
    await brain.remember({
      command: 'previous price check',
      intent: 'PRICE_UPDATE',
      result: 'Checked Wireless Earbuds pricing',
    });

    const prepared = await service.prepareCommand({
      tenantId: 'tenant_hybrid',
      command: 'Optimaliseer prijzen voor Wireless Earbuds',
    });

    expect(prepared.contextSnippets.length).toBeGreaterThan(0);
    expect(prepared.contextSnippets.some((s) => s.includes('Wireless Earbuds Pro'))).toBe(true);
    expect(mockAdminData.searchProductsByName).toHaveBeenCalled();
  });

  it('isolates retrieval per tenant', async () => {
    const otherBrain = layer.personalBrainRegistry.get('tenant_other', 'admin');
    await otherBrain.indexKnowledge({
      id: 'product:secret',
      content: '[product] Secret Product | price=999.00 EUR | stock=1 | marginIndicator=healthy | slug=secret',
    });

    const prepared = await service.prepareCommand({
      tenantId: 'tenant_isolated',
      command: 'Secret Product',
    });

    expect(prepared.contextSnippets.every((s) => !s.includes('Secret Product'))).toBe(true);
  });
});
