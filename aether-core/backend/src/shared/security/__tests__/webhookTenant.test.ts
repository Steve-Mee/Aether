import request from 'supertest';
import { createApp } from '../../../app';
import { prisma } from '../../../shared/prisma/client';

const describeIfDb = process.env.CI === 'true' ? describe : describe.skip;

describeIfDb('Webhook tenant binding', () => {
  const app = createApp();
  const originalEnv = process.env;

  beforeAll(async () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      SUPPLIER_WEBHOOK_SECRET: 'supplier-secret-bind',
      AETHER_DEFAULT_TENANT: 'tenant_default',
    };

    await prisma.tenant.upsert({
      where: { slug: 'default' },
      update: {},
      create: { id: 'tenant_default', name: 'Default Merchant', slug: 'default' },
    });

    await prisma.supplier.upsert({
      where: { id: 'sup_webhook_test' },
      update: {},
      create: {
        id: 'sup_webhook_test',
        tenantId: 'tenant_default',
        name: 'Webhook Test Supplier',
        website: 'https://supplier.test',
      },
    });
  });

  afterAll(async () => {
    await prisma.supplierWebhookEvent.deleteMany({ where: { supplierId: 'sup_webhook_test' } });
    process.env = originalEnv;
  });

  it('rejects supplier webhook when tenant header mismatches resolved supplier tenant', async () => {
    const res = await request(app)
      .post('/api/suppliers/webhook')
      .set('X-Webhook-Secret', 'supplier-secret-bind')
      .set('X-Aether-Tenant-Id', 'tenant_other')
      .send({
        supplierId: 'sup_webhook_test',
        products: [{ sku: 'SKU1', name: 'Test', price: 10, stock: 5 }],
      });

    expect(res.status).toBe(403);
  });

  it('accepts supplier webhook when tenant resolves from supplier record', async () => {
    const res = await request(app)
      .post('/api/suppliers/webhook')
      .set('X-Webhook-Secret', 'supplier-secret-bind')
      .send({
        supplierId: 'sup_webhook_test',
        products: [{ sku: 'SKU1', name: 'Test', price: 10, stock: 5 }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
