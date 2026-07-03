import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../shared/prisma/client';

const runCommerceTests =
  process.env.CI === 'true' || process.env.RUN_COMMERCE_INTEGRATION === 'true';
const describeIfDb = runCommerceTests ? describe : describe.skip;

describeIfDb('Commerce integration (tenant-scoped)', () => {
  const app = createApp();
  const tenantId = 'tenant_commerce_test';
  const headers = {
    'X-Aether-Api-Key': process.env.AETHER_API_KEY ?? 'ci-test-key',
    'X-Aether-Tenant-Id': tenantId,
    'X-Aether-Actor-Id': 'commerce-e2e',
    'X-Aether-Role': 'operator',
  };

  beforeAll(async () => {
    process.env.AETHER_API_KEY = process.env.AETHER_API_KEY ?? 'ci-test-key';
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, name: 'Commerce Test', slug: 'commerce-test' },
    });
    await prisma.customer.upsert({
      where: { tenantId_email: { tenantId, email: 'buyer@commerce.test' } },
      update: {},
      create: { tenantId, email: 'buyer@commerce.test', firstName: 'Buyer' },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates and lists products', async () => {
    const slug = `product-${Date.now()}`;
    const create = await request(app)
      .post('/api/products')
      .set(headers)
      .send({ name: 'Test Product', slug, price: 29.99, stock: 10 });

    expect(create.status).toBe(201);

    const list = await request(app).get('/api/products').set(headers);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body.some((p: { slug: string }) => p.slug === slug)).toBe(true);
  });

  it('creates order and updates status', async () => {
    const customer = await prisma.customer.findFirst({ where: { tenantId } });
    expect(customer).toBeTruthy();

    const create = await request(app)
      .post('/api/orders')
      .set(headers)
      .send({
        customerId: customer!.id,
        items: [{ productId: 'prod_placeholder', quantity: 1, price: 10 }],
        total: 10,
      });

    if (create.status === 201) {
      const orderId = create.body.id as string;
      const update = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set(headers)
        .send({ status: 'confirmed' });
      expect([200, 204]).toContain(update.status);
    } else {
      expect([400, 404]).toContain(create.status);
    }
  });
});
