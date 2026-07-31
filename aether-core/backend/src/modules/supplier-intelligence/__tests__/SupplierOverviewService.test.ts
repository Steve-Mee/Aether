import { PrismaSupplierOverviewAdapter } from '../infrastructure/adapters/PrismaSupplierOverviewAdapter';
import { SupplierOverviewService } from '../application/services/SupplierOverviewService';

function createMockPrisma() {
  const suppliers = [
    {
      id: 'sup_1',
      tenantId: 'tenant_test',
      name: 'Nordic Test',
      website: 'https://nordic.test',
      status: 'active',
      autoSyncEnabled: true,
      supplierType: 'wholesale',
      createdAt: new Date(),
      products: [{ lastUpdated: new Date() }],
      _count: { products: 1 },
    },
  ];

  const changesWeek = [
    {
      id: 'ch_1',
      tenantId: 'tenant_test',
      supplierId: 'sup_1',
      changeType: 'price_change',
      payload: JSON.stringify({ sku: 'W-1', oldPrice: 12, newPrice: 10 }),
      status: 'pending',
      createdAt: new Date(),
    },
    {
      id: 'ch_2',
      tenantId: 'tenant_test',
      supplierId: 'sup_1',
      changeType: 'stock_change',
      payload: JSON.stringify({ sku: 'W-2', oldStock: 10, newStock: 3 }),
      status: 'pending',
      createdAt: new Date(),
    },
  ];

  return {
    supplier: {
      findMany: jest.fn().mockResolvedValue(suppliers),
      findFirst: jest.fn().mockResolvedValue({
        ...suppliers[0],
        products: [
          {
            id: 'p1',
            sku: 'W-1',
            name: 'Widget',
            currentPrice: 10,
            stock: 5,
            lastUpdated: new Date(),
          },
        ],
        _count: { products: 1 },
      }),
    },
    supplierChange: {
      findMany: jest
        .fn()
        .mockResolvedValueOnce(changesWeek)
        .mockResolvedValueOnce(changesWeek)
        .mockResolvedValue(changesWeek),
    },
    supplierWebhookEvent: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    domainEvent: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    auditLog: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'audit_1',
          tenantId: 'tenant_test',
          module: 'supplier-intelligence',
          action: 'autonomy_measure',
          actor: 'scheduler',
          details: JSON.stringify({
            supplierId: 'sup_1',
            changeCount: 2,
            productsFound: 5,
          }),
          createdAt: new Date(),
        },
      ]),
    },
    approval: {
      count: jest.fn().mockResolvedValue(2),
    },
  };
}

function createService() {
  const prisma = createMockPrisma();
  return new SupplierOverviewService(
    new PrismaSupplierOverviewAdapter(prisma as never)
  );
}

describe('SupplierOverviewService', () => {
  it('aggregates overview stats, syncs, and important change flags', async () => {
    const service = createService();

    const overview = await service.getOverview('tenant_test');
    expect(overview.stats.totalMonitored).toBe(1);
    expect(overview.stats.activeAutoSyncs).toBe(1);
    expect(overview.stats.syncsCompletedThisMonth).toBe(1);
    expect(overview.stats.priceDropsThisMonth).toBeGreaterThanOrEqual(1);

    const row = overview.suppliers[0];
    expect(row.hasRecentPriceDrop).toBe(true);
    expect(row.hasRecentStockChange).toBe(true);
    expect(row.hasRecentImportantChange).toBe(true);
    expect(row.lastAutoSyncAt).toBeTruthy();
  });

  it('returns supplier detail with changes, products, and sync history', async () => {
    const service = createService();

    const detail = await service.getDetail('tenant_test', 'sup_1');
    expect(detail?.recentChanges.length).toBe(2);
    expect(detail?.recentProducts).toHaveLength(1);
    expect(detail?.recentSyncs.length).toBeGreaterThanOrEqual(1);
  });
});
