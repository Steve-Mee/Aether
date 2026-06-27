import { createInMemoryIntelligenceLayer } from '../../createIntelligenceLayer';
import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import { MerchantKnowledgeIndexer } from '../MerchantKnowledgeIndexer';
import { formatProductSnippet } from '../formatProductSnippet';

describe('MerchantKnowledgeIndexer', () => {
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
    listSuppliers: jest.fn(),
    findLatestProposedOutcome: jest.fn(),
    countRecentCommands: jest.fn(),
    listLowStockInventory: jest.fn(),
    listProductsForBrain: jest.fn().mockResolvedValue([
      {
        id: 'prod_1',
        name: 'Wireless Earbuds Pro',
        price: 49.99,
        stock: 85,
        slug: 'wireless-earbuds-pro',
        description: 'Premium earbuds',
      },
    ]),
    searchProductsByName: jest.fn(),
    updateProductPricesByIds: jest.fn(),
    restoreProductPrices: jest.fn(),
  };

  it('indexes products into PersonalBrain vector store', async () => {
    const indexer = new MerchantKnowledgeIndexer(layer.personalBrainRegistry, mockAdminData);
    const count = await indexer.indexProducts('tenant_index', 'admin');
    expect(count).toBe(1);

    const brain = layer.personalBrainRegistry.get('tenant_index', 'admin');
    const recall = await brain.recall('Wireless Earbuds Pro price stock', 5);
    expect(recall.snippets.some((s) => s.includes('Wireless Earbuds Pro'))).toBe(true);
  });

  it('re-index is idempotent (stable product ids)', async () => {
    const indexer = new MerchantKnowledgeIndexer(layer.personalBrainRegistry, mockAdminData);
    const first = await indexer.indexProducts('tenant_idem', 'admin');
    const second = await indexer.indexProducts('tenant_idem', 'admin');
    expect(first).toBe(1);
    expect(second).toBe(1);

    const product = {
      id: 'prod_1',
      name: 'Wireless Earbuds Pro',
      price: 49.99,
      stock: 85,
      slug: 'wireless-earbuds-pro',
    };
    const brain = layer.personalBrainRegistry.get('tenant_idem', 'admin');
    const recall = await brain.recall(formatProductSnippet(product), 10);
    const productSnippets = recall.snippets.filter((s) => s.startsWith('[product]'));
    expect(productSnippets.length).toBeGreaterThanOrEqual(1);
  });

  it('formatProductSnippet produces searchable content', () => {
    const snippet = formatProductSnippet({
      id: 'p1',
      name: 'Wireless Earbuds Pro',
      price: 49.99,
      stock: 85,
      slug: 'wireless-earbuds-pro',
    });
    expect(snippet).toContain('[product]');
    expect(snippet).toContain('49.99 EUR');
    expect(snippet).toContain('stock=85');
  });
});
