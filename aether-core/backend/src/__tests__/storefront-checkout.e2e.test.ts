/**
 * P13 → P14 handoff: DB-backed catalog → cart → checkout sandbox.
 *
 * Proves public storefront commerce path under FEATURE_STOREFRONT_PUBLIC_API:
 * live site + seeded product → create cart → add item → checkout with
 * Idempotency-Key → orderId + clientSecret, tenant-scoped.
 *
 * Runs when CI=true (same gate as storefront-publish.e2e).
 * P14 should keep this green when graduating truth-matrix / feature-status.
 */
import request from 'supertest';
import { createApp } from '../app';
import { prisma } from '../shared/prisma/client';

const describeIfDb = process.env.CI === 'true' ? describe : describe.skip;

describeIfDb('Storefront checkout E2E (DB-backed, P13→P14)', () => {
  const app = createApp();
  const headers = {
    'X-Aether-Api-Key': process.env.AETHER_API_KEY ?? 'ci-test-key',
    'X-Aether-Tenant-Id': 'tenant_default',
    'X-Aether-Actor-Id': 'storefront-checkout-e2e',
  };

  const prevBuilder = process.env.STOREFRONT_BUILDER_ENABLED;
  const prevPublic = process.env.STOREFRONT_PUBLIC_API_ENABLED;
  const prevFeatureBuilder = process.env.FEATURE_STOREFRONT_BUILDER;
  const prevFeaturePublic = process.env.FEATURE_STOREFRONT_PUBLIC_API;
  const prevPreviewSecret = process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
  const prevPaymentProvider = process.env.PAYMENT_PROVIDER;

  let slug: string;
  let productId: string;

  beforeAll(async () => {
    process.env.AETHER_API_KEY = process.env.AETHER_API_KEY ?? 'ci-test-key';
    process.env.NODE_ENV = 'test';
    process.env.PAYMENT_PROVIDER = 'local';
    process.env.STOREFRONT_PREVIEW_HMAC_SECRET =
      process.env.STOREFRONT_PREVIEW_HMAC_SECRET || 'ci-storefront-preview-hmac-secret';
    slug = `e2e-chk-${Date.now().toString(36)}`;

    const product = await prisma.product.upsert({
      where: {
        tenantId_slug: { tenantId: 'tenant_default', slug: 'e2e-checkout-bowl' },
      },
      update: { stock: 10, status: 'active', price: 25 },
      create: {
        tenantId: 'tenant_default',
        name: 'E2E Checkout Bowl',
        slug: 'e2e-checkout-bowl',
        description: 'P13 checkout proof product',
        price: 25,
        stock: 10,
        status: 'active',
      },
    });
    productId = product.id;
  });

  afterAll(async () => {
    if (prevBuilder === undefined) delete process.env.STOREFRONT_BUILDER_ENABLED;
    else process.env.STOREFRONT_BUILDER_ENABLED = prevBuilder;
    if (prevPublic === undefined) delete process.env.STOREFRONT_PUBLIC_API_ENABLED;
    else process.env.STOREFRONT_PUBLIC_API_ENABLED = prevPublic;
    if (prevFeatureBuilder === undefined) delete process.env.FEATURE_STOREFRONT_BUILDER;
    else process.env.FEATURE_STOREFRONT_BUILDER = prevFeatureBuilder;
    if (prevFeaturePublic === undefined) delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
    else process.env.FEATURE_STOREFRONT_PUBLIC_API = prevFeaturePublic;
    if (prevPreviewSecret === undefined) delete process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
    else process.env.STOREFRONT_PREVIEW_HMAC_SECRET = prevPreviewSecret;
    if (prevPaymentProvider === undefined) delete process.env.PAYMENT_PROVIDER;
    else process.env.PAYMENT_PROVIDER = prevPaymentProvider;

    try {
      await prisma.siteProject.deleteMany({
        where: { tenantId: 'tenant_default', slug },
      });
      // CartItem FK blocks product delete — clear carts for this tenant's e2e product first
      await prisma.cartItem.deleteMany({
        where: { productId },
      });
      await prisma.orderItem.deleteMany({
        where: { productId },
      }).catch(() => undefined);
      await prisma.product.deleteMany({
        where: { tenantId: 'tenant_default', slug: 'e2e-checkout-bowl' },
      });
    } catch {
      // ignore if tables unavailable
    }
    await prisma.$disconnect();
  });

  function enableStorefrontFlags() {
    process.env.FEATURE_STOREFRONT_BUILDER = 'true';
    process.env.FEATURE_STOREFRONT_PUBLIC_API = 'true';
    delete process.env.STOREFRONT_BUILDER_ENABLED;
    delete process.env.STOREFRONT_PUBLIC_API_ENABLED;
  }

  async function publishLiveSite(): Promise<void> {
    enableStorefrontFlags();

    const createRes = await request(app)
      .post('/api/website/projects')
      .set(headers)
      .send({
        slug,
        brief: {
          prompt: 'E2E checkout storefront',
          localeDefault: 'nl-NL',
          brand: { name: 'E2E Checkout', primaryColor: '#3D2B1F', accentColor: '#C4A484' },
        },
      });
    expect(createRes.status).toBe(201);
    const revisionId = createRes.body.revision.id as string;

    const buildRes = await request(app)
      .post(`/api/website/revisions/${revisionId}/build`)
      .set(headers);
    expect(buildRes.status).toBe(202);

    const publishRes = await request(app)
      .post(`/api/website/revisions/${revisionId}/publish`)
      .set(headers);
    expect(publishRes.status).toBe(201);
    const approvalId = publishRes.body.approval.id as string;

    const resolveRes = await request(app)
      .post(`/api/approvals/${approvalId}/resolve`)
      .set(headers)
      .send({ approve: true });
    expect(resolveRes.status).toBe(200);
  }

  it('catalog → cart → checkout returns orderId + clientSecret for tenant_default', async () => {
    await publishLiveSite();

    const catalogRes = await request(app).get(`/api/storefront/${slug}/catalog`);
    expect(catalogRes.status).toBe(200);
    const catalogProduct = (catalogRes.body.products as Array<{ id: string; slug: string }>).find(
      (p) => p.slug === 'e2e-checkout-bowl' || p.id === productId
    );
    expect(catalogProduct).toBeTruthy();
    const buyProductId = catalogProduct!.id;

    const emptyCartRes = await request(app).post(`/api/storefront/${slug}/carts`);
    expect(emptyCartRes.status).toBe(201);
    const emptyCartId = emptyCartRes.body.cart.id as string;

    const emptyCheckout = await request(app)
      .post(`/api/storefront/${slug}/checkout`)
      .set('Idempotency-Key', `empty-${slug}`)
      .send({
        cartId: emptyCartId,
        customer: { email: 'empty@example.com' },
        paymentMethod: 'local',
      });
    expect(emptyCheckout.status).toBe(422);
    expect(emptyCheckout.body.error.code).toBe('CART_EMPTY');

    const cartRes = await request(app).post(`/api/storefront/${slug}/carts`);
    expect(cartRes.status).toBe(201);
    const cartId = cartRes.body.cart.id as string;

    const overstock = await request(app)
      .post(`/api/storefront/${slug}/carts/${cartId}/items`)
      .send({ productId: buyProductId, quantity: 9999 });
    expect(overstock.status).toBe(422);
    expect(overstock.body.error.code).toBe('STOCK_INSUFFICIENT');

    const addRes = await request(app)
      .post(`/api/storefront/${slug}/carts/${cartId}/items`)
      .send({ productId: buyProductId, quantity: 1 });
    expect(addRes.status).toBe(201);

    const idemKey = `checkout-${slug}`;
    const checkoutRes = await request(app)
      .post(`/api/storefront/${slug}/checkout`)
      .set('Idempotency-Key', idemKey)
      .send({
        cartId,
        customer: {
          email: `buyer-${slug}@example.com`,
          firstName: 'Ada',
          lastName: 'Lovelace',
        },
        paymentMethod: 'stripe',
      });

    expect(checkoutRes.status).toBe(201);
    expect(typeof checkoutRes.body.orderId).toBe('string');
    expect(checkoutRes.body.orderId.length).toBeGreaterThan(0);
    expect(typeof checkoutRes.body.clientSecret).toBe('string');

    const order = await prisma.order.findFirst({
      where: { id: checkoutRes.body.orderId, tenantId: 'tenant_default' },
    });
    expect(order).toBeTruthy();
    expect(order!.tenantId).toBe('tenant_default');

    const replay = await request(app)
      .post(`/api/storefront/${slug}/checkout`)
      .set('Idempotency-Key', idemKey)
      .send({
        cartId,
        customer: { email: `buyer-${slug}@example.com` },
        paymentMethod: 'stripe',
      });
    expect(replay.status).toBe(201);
    expect(replay.body.orderId).toBe(checkoutRes.body.orderId);
  });
});
