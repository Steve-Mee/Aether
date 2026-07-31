import express from 'express';
import request from 'supertest';
import storefrontRouter from '../api/storefrontRouter';
import { SiteProject } from '../domain/entities/SiteProject';
import { Cart, CartItem } from '../domain/entities/Cart';
import type {
  AddCartItemInput,
  CartRepository,
  CreateCartInput,
  UpdateCartItemInput,
} from '../domain/repositories/CartRepository';
import type { CartStatus } from '../domain/entities/Cart';
import type {
  CheckoutIdempotencyPort,
  CheckoutIdempotencyRecord,
} from '../application/ports/CheckoutIdempotencyPort';
import type { StorefrontCatalogProduct } from '../application/ports/StorefrontCatalogPort';
import { CreateCartUseCase } from '../application/use-cases/CreateCartUseCase';
import { GetCartUseCase } from '../application/use-cases/GetCartUseCase';
import { AddCartItemUseCase } from '../application/use-cases/AddCartItemUseCase';
import { UpdateCartItemUseCase } from '../application/use-cases/UpdateCartItemUseCase';
import { RemoveCartItemUseCase } from '../application/use-cases/RemoveCartItemUseCase';
import { CheckoutCartUseCase } from '../application/use-cases/CheckoutCartUseCase';
import { CreateOrderUseCase } from '../../order-management/application/use-cases/CreateOrderUseCase';
import { Payment } from '../../payment-fulfillment/domain/entities/Payment';
import { resetStorefrontRateLimitForTests } from '../api/storefrontRateLimit';

const liveProject = new SiteProject(
  'proj_a',
  'tenant_a',
  'atelier-noord',
  null,
  'live',
  'rev_live',
  new Date('2026-07-26T08:00:00.000Z'),
  new Date('2026-07-26T08:00:00.000Z')
);

const productInStock: StorefrontCatalogProduct = {
  id: 'prod_1',
  name: 'Kom Aarde',
  slug: 'kom-aarde',
  description: 'Handmade',
  price: 42,
  currency: 'EUR',
  stock: 5,
  imageUrl: null,
  status: 'active',
};

const productLowStock: StorefrontCatalogProduct = {
  id: 'prod_low',
  name: 'Limited',
  slug: 'limited',
  description: null,
  price: 10,
  currency: 'EUR',
  stock: 1,
  imageUrl: null,
  status: 'active',
};

class InMemoryCartRepository implements CartRepository {
  private carts = new Map<string, Cart>();
  private seq = 0;

  async create(input: CreateCartInput): Promise<Cart> {
    const id = `cart_${++this.seq}`;
    const cart = new Cart(
      id,
      input.tenantId,
      'open',
      input.currency ?? 'EUR',
      input.customerId ?? null,
      []
    );
    this.carts.set(id, cart);
    return cart;
  }

  async findById(tenantId: string, cartId: string): Promise<Cart | null> {
    const cart = this.carts.get(cartId);
    if (!cart || cart.tenantId !== tenantId) return null;
    return cart;
  }

  async addOrBumpItem(input: AddCartItemInput): Promise<Cart> {
    const cart = await this.findById(input.tenantId, input.cartId);
    if (!cart || cart.status !== 'open') throw new Error('CART_NOT_FOUND');
    const variantId = input.variantId ?? null;
    const existing = cart.items.find(
      (i) => i.productId === input.productId && (i.variantId ?? null) === variantId
    );
    if (existing) {
      existing.quantity += input.quantity;
      existing.unitPrice = input.unitPrice;
    } else {
      cart.items.push(
        new CartItem(
          `item_${++this.seq}`,
          cart.id,
          input.productId,
          input.quantity,
          variantId,
          input.unitPrice
        )
      );
    }
    return cart;
  }

  async updateItemQuantity(input: UpdateCartItemInput): Promise<Cart | null> {
    const cart = await this.findById(input.tenantId, input.cartId);
    if (!cart || cart.status !== 'open') return null;
    const item = cart.items.find((i) => i.id === input.itemId);
    if (!item) return null;
    item.quantity = input.quantity;
    return cart;
  }

  async removeItem(
    tenantId: string,
    cartId: string,
    itemId: string
  ): Promise<Cart | null> {
    const cart = await this.findById(tenantId, cartId);
    if (!cart || cart.status !== 'open') return null;
    const idx = cart.items.findIndex((i) => i.id === itemId);
    if (idx < 0) return null;
    cart.items.splice(idx, 1);
    return cart;
  }

  async updateStatus(
    tenantId: string,
    cartId: string,
    status: CartStatus
  ): Promise<void> {
    const cart = await this.findById(tenantId, cartId);
    if (cart) cart.status = status;
  }

  async setCustomerId(
    tenantId: string,
    cartId: string,
    customerId: string
  ): Promise<void> {
    const cart = await this.findById(tenantId, cartId);
    if (cart) cart.customerId = customerId;
  }
}

class InMemoryCheckoutIdempotency implements CheckoutIdempotencyPort {
  private store = new Map<string, CheckoutIdempotencyRecord>();
  private key(tenantId: string, k: string) {
    return `${tenantId}::${k}`;
  }
  async find(tenantId: string, key: string) {
    return this.store.get(this.key(tenantId, key)) ?? null;
  }
  async save(record: CheckoutIdempotencyRecord) {
    this.store.set(this.key(record.tenantId, record.key), record);
  }
}

const siteRepository = {
  findProjectByPublicSlug: jest.fn(),
};

const catalogProducts = new Map<string, StorefrontCatalogProduct>([
  [productInStock.id, { ...productInStock }],
  [productLowStock.id, { ...productLowStock }],
]);

const storefrontCatalog = {
  listProducts: jest.fn(async (tenantId: string) => {
    if (tenantId !== 'tenant_a') return { products: [], nextCursor: null };
    return {
      products: Array.from(catalogProducts.values()),
      nextCursor: null,
    };
  }),
  getProductBySlug: jest.fn(),
  getProductById: jest.fn(async (tenantId: string, productId: string) => {
    if (tenantId !== 'tenant_a') return null;
    return catalogProducts.get(productId) ?? null;
  }),
  decrementStock: jest.fn(
    async (
      tenantId: string,
      lines: Array<{ productId: string; quantity: number }>
    ) => {
      if (tenantId !== 'tenant_a') return;
      for (const line of lines) {
        const p = catalogProducts.get(line.productId);
        if (p) p.stock = Math.max(0, p.stock - line.quantity);
      }
    }
  ),
};

const createdOrders: Array<{ tenantId: string; orderId: string }> = [];

const orderRepo = {
  create: jest.fn(async (data: {
    tenantId: string;
    customerId: string;
    status: string;
    total: number;
    currency: string;
    items: Array<{ id: string; productId: string; quantity: number; price: number }>;
  }) => {
    const id = `ord_${createdOrders.length + 1}`;
    createdOrders.push({ tenantId: data.tenantId, orderId: id });
    return {
      id,
      customerId: data.customerId,
      status: data.status,
      total: data.total,
      currency: data.currency,
      createdAt: new Date(),
      updatedAt: new Date(),
      items: data.items,
    };
  }),
};

const paymentService = {
  processPayment: jest.fn(
    async (orderId: string, amount: number, paymentMethod: string) => {
      const txn = `local_txn_${orderId}`;
      return {
        payment: new Payment(
          `pay_${orderId}`,
          orderId,
          amount,
          'EUR',
          'paid',
          paymentMethod,
          txn
        ),
        clientSecret: `local_cs_${txn}`,
      };
    }
  ),
};

const storefrontCustomers = {
  upsertByEmail: jest.fn(async (_tenantId: string, input: { email: string }) => ({
    id: 'cust_1',
    email: input.email,
  })),
};

let cartRepository: InMemoryCartRepository;
let checkoutIdempotency: InMemoryCheckoutIdempotency;
let createStorefrontCart: CreateCartUseCase;
let getStorefrontCart: GetCartUseCase;
let addStorefrontCartItem: AddCartItemUseCase;
let updateStorefrontCartItem: UpdateCartItemUseCase;
let removeStorefrontCartItem: RemoveCartItemUseCase;
let checkoutStorefrontCart: CheckoutCartUseCase;

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    createStorefrontCart,
    getStorefrontCart,
    addStorefrontCartItem,
    updateStorefrontCartItem,
    removeStorefrontCartItem,
    checkoutStorefrontCart,
    siteRepository,
    storefrontCatalog,
  }),
}));

jest.mock('../../../shared/prisma/client', () => ({
  prisma: {
    tenantFeature: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}));

import { featureGate } from '../../../shared/features/featureFlags';
import { GetStorefrontCatalogUseCase } from '../application/use-cases/GetStorefrontCatalogUseCase';

function createTestApp() {
  process.env.STOREFRONT_PUBLIC_API_ENABLED = 'true';
  delete process.env.FEATURE_STOREFRONT_PUBLIC_API;
  const app = express();
  app.use(express.json());
  app.use('/api/storefront', featureGate('storefront-public-api'), storefrontRouter);
  return app;
}

describe('Storefront cart/checkout API (P13)', () => {
  const prevFlag = process.env.STOREFRONT_PUBLIC_API_ENABLED;

  beforeEach(() => {
    jest.clearAllMocks();
    resetStorefrontRateLimitForTests();
    createdOrders.length = 0;
    catalogProducts.set(productInStock.id, { ...productInStock });
    catalogProducts.set(productLowStock.id, { ...productLowStock });

    cartRepository = new InMemoryCartRepository();
    checkoutIdempotency = new InMemoryCheckoutIdempotency();
    siteRepository.findProjectByPublicSlug.mockImplementation(async (slug: string) =>
      slug === 'atelier-noord' ? liveProject : null
    );

    const createOrder = new CreateOrderUseCase(orderRepo as never);
    createStorefrontCart = new CreateCartUseCase(siteRepository as never, cartRepository);
    getStorefrontCart = new GetCartUseCase(siteRepository as never, cartRepository);
    addStorefrontCartItem = new AddCartItemUseCase(
      siteRepository as never,
      cartRepository,
      storefrontCatalog as never
    );
    updateStorefrontCartItem = new UpdateCartItemUseCase(
      siteRepository as never,
      cartRepository,
      storefrontCatalog as never
    );
    removeStorefrontCartItem = new RemoveCartItemUseCase(
      siteRepository as never,
      cartRepository
    );
    checkoutStorefrontCart = new CheckoutCartUseCase(
      siteRepository as never,
      cartRepository,
      storefrontCatalog as never,
      createOrder,
      paymentService as never,
      checkoutIdempotency,
      storefrontCustomers
    );
  });

  afterAll(() => {
    if (prevFlag === undefined) delete process.env.STOREFRONT_PUBLIC_API_ENABLED;
    else process.env.STOREFRONT_PUBLIC_API_ENABLED = prevFlag;
  });

  it('E2E: catalog → cart → checkout returns orderId + clientSecret under correct tenant', async () => {
    const app = createTestApp();
    const catalogUc = new GetStorefrontCatalogUseCase(
      siteRepository as never,
      storefrontCatalog as never
    );
    const catalog = await catalogUc.execute('atelier-noord');
    expect(catalog.products[0]?.id).toBe('prod_1');

    const createRes = await request(app)
      .post('/api/storefront/atelier-noord/carts')
      .expect(201);
    const cartId = createRes.body.cart.id as string;

    await request(app)
      .post(`/api/storefront/atelier-noord/carts/${cartId}/items`)
      .send({ productId: 'prod_1', quantity: 2 })
      .expect(201);

    const checkoutRes = await request(app)
      .post('/api/storefront/atelier-noord/checkout')
      .set('Idempotency-Key', 'e2e-key-1')
      .send({
        cartId,
        customer: { email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
        paymentMethod: 'stripe',
      })
      .expect(201);

    expect(checkoutRes.body.orderId).toBe('ord_1');
    expect(checkoutRes.body.clientSecret).toMatch(/^local_cs_/);
    expect(createdOrders).toEqual([{ tenantId: 'tenant_a', orderId: 'ord_1' }]);
    expect(paymentService.processPayment).toHaveBeenCalledWith(
      'ord_1',
      84,
      'stripe',
      expect.objectContaining({ tenantId: 'tenant_a' })
    );
    expect(storefrontCatalog.decrementStock).toHaveBeenCalled();
  });

  it('cannot checkout empty cart → 422 CART_EMPTY', async () => {
    const app = createTestApp();
    const createRes = await request(app)
      .post('/api/storefront/atelier-noord/carts')
      .expect(201);
    const cartId = createRes.body.cart.id as string;

    const res = await request(app)
      .post('/api/storefront/atelier-noord/checkout')
      .set('Idempotency-Key', 'empty-key')
      .send({
        cartId,
        customer: { email: 'a@b.c' },
        paymentMethod: 'stripe',
      })
      .expect(422);

    expect(res.body.error.code).toBe('CART_EMPTY');
    expect(createdOrders).toHaveLength(0);
  });

  it('stock insufficient → 422 STOCK_INSUFFICIENT', async () => {
    const app = createTestApp();
    const createRes = await request(app)
      .post('/api/storefront/atelier-noord/carts')
      .expect(201);
    const cartId = createRes.body.cart.id as string;

    const res = await request(app)
      .post(`/api/storefront/atelier-noord/carts/${cartId}/items`)
      .send({ productId: 'prod_low', quantity: 5 })
      .expect(422);

    expect(res.body.error.code).toBe('STOCK_INSUFFICIENT');
  });

  it('idempotent checkout replay returns same orderId without duplicate order', async () => {
    const app = createTestApp();
    const createRes = await request(app)
      .post('/api/storefront/atelier-noord/carts')
      .expect(201);
    const cartId = createRes.body.cart.id as string;

    await request(app)
      .post(`/api/storefront/atelier-noord/carts/${cartId}/items`)
      .send({ productId: 'prod_1', quantity: 1 })
      .expect(201);

    const first = await request(app)
      .post('/api/storefront/atelier-noord/checkout')
      .set('Idempotency-Key', 'replay-key')
      .send({
        cartId,
        customer: { email: 'replay@example.com' },
        paymentMethod: 'local',
      })
      .expect(201);

    const second = await request(app)
      .post('/api/storefront/atelier-noord/checkout')
      .set('Idempotency-Key', 'replay-key')
      .send({
        cartId,
        customer: { email: 'replay@example.com' },
        paymentMethod: 'local',
      })
      .expect(201);

    expect(second.body.orderId).toBe(first.body.orderId);
    expect(second.body.clientSecret).toBe(first.body.clientSecret);
    expect(createdOrders).toHaveLength(1);
  });

  it('checkout without idempotency key → 400', async () => {
    const app = createTestApp();
    const createRes = await request(app)
      .post('/api/storefront/atelier-noord/carts')
      .expect(201);

    const res = await request(app)
      .post('/api/storefront/atelier-noord/checkout')
      .send({
        cartId: createRes.body.cart.id,
        customer: { email: 'a@b.c' },
      })
      .expect(400);

    expect(res.body.error.code).toBe('CHECKOUT_IDEMPOTENCY_REQUIRED');
  });

  it('security: cart from tenant_a is not readable/checkoutable under unknown slug', async () => {
    const app = createTestApp();
    const createRes = await request(app)
      .post('/api/storefront/atelier-noord/carts')
      .expect(201);
    const cartId = createRes.body.cart.id as string;

    await request(app)
      .post(`/api/storefront/atelier-noord/carts/${cartId}/items`)
      .send({ productId: 'prod_1', quantity: 1 })
      .expect(201);

    await request(app)
      .get(`/api/storefront/other-shop/carts/${cartId}`)
      .expect(404);

    const checkoutRes = await request(app)
      .post('/api/storefront/other-shop/checkout')
      .set('Idempotency-Key', 'cross-tenant-key')
      .send({
        cartId,
        customer: { email: 'evil@example.com' },
        paymentMethod: 'stripe',
      })
      .expect(404);

    expect(checkoutRes.body.error.code).toMatch(/SITE_NOT_FOUND|CART_NOT_FOUND/);
    expect(createdOrders).toHaveLength(0);
  });

  it('checkout-time stock race → 422 STOCK_INSUFFICIENT', async () => {
    const app = createTestApp();
    const createRes = await request(app)
      .post('/api/storefront/atelier-noord/carts')
      .expect(201);
    const cartId = createRes.body.cart.id as string;

    await request(app)
      .post(`/api/storefront/atelier-noord/carts/${cartId}/items`)
      .send({ productId: 'prod_low', quantity: 1 })
      .expect(201);

    // Simulate stock drained after add
    catalogProducts.set(productLowStock.id, { ...productLowStock, stock: 0 });

    const res = await request(app)
      .post('/api/storefront/atelier-noord/checkout')
      .set('Idempotency-Key', 'stock-race-key')
      .send({
        cartId,
        customer: { email: 'stock@example.com' },
        paymentMethod: 'stripe',
      })
      .expect(422);

    expect(res.body.error.code).toBe('STOCK_INSUFFICIENT');
    expect(createdOrders).toHaveLength(0);
  });
});
