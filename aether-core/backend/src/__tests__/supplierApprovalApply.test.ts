import { PrismaSupplierChangeAdapter } from '../modules/supplier-intelligence/infrastructure/adapters/PrismaSupplierChangeAdapter';
import { prisma } from '../shared/prisma/client';

jest.mock('../ai/orchestrator/Orchestrator', () => ({
  orchestrator: { execute: jest.fn().mockResolvedValue({ success: true }) },
}));

describe('SupplierChangePort.applyPendingChanges', () => {
  const adapter = new PrismaSupplierChangeAdapter();
  const tenantId = 'tenant_supplier_apply_test';

  beforeAll(async () => {
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, name: 'Supplier Apply Test', slug: 'supplier-apply-test' },
    });
  });

  afterAll(async () => {
    await prisma.supplierProduct.deleteMany({ where: { supplier: { tenantId } } });
    await prisma.supplierChange.deleteMany({ where: { tenantId } });
    await prisma.supplier.deleteMany({ where: { tenantId } });
    await prisma.$disconnect();
  });

  it('applies price_change to supplier product', async () => {
    const supplier = await prisma.supplier.create({
      data: { tenantId, name: 'Test Supplier', website: 'https://example.com' },
    });

    await prisma.supplierProduct.create({
      data: {
        supplierId: supplier.id,
        sku: 'SKU-1',
        name: 'Widget',
        currentPrice: 10,
        stock: 5,
      },
    });

    await adapter.recordChange({
      tenantId,
      supplierId: supplier.id,
      changeType: 'price_change',
      payload: JSON.stringify({
        type: 'price_change',
        sku: 'SKU-1',
        newPrice: 12,
        name: 'Widget',
      }),
      status: 'pending',
    });

    const applied = await adapter.applyPendingChanges(tenantId, supplier.id, {
      type: 'price_change',
      sku: 'SKU-1',
      newPrice: 12,
    });

    expect(applied).toBeGreaterThan(0);

    const product = await prisma.supplierProduct.findFirst({
      where: { supplierId: supplier.id, sku: 'SKU-1' },
    });
    expect(product?.currentPrice).toBe(12);

    const change = await prisma.supplierChange.findFirst({
      where: { tenantId, supplierId: supplier.id, status: 'applied' },
    });
    expect(change).toBeTruthy();
  });
});
