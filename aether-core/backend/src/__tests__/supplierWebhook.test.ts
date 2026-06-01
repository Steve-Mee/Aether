import request from 'supertest';
import { createApp } from '../app';

jest.mock('../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../shared/events/eventBus', () => ({
  eventBus: {
    publish: jest.fn().mockResolvedValue(undefined),
    subscribe: jest.fn(),
  },
}));

jest.mock('../shared/prisma/client', () => ({
  prisma: {
    supplierWebhookEvent: {
      create: jest.fn().mockResolvedValue({ id: 'evt_test_1' }),
    },
    supplierProduct: {
      upsert: jest.fn().mockResolvedValue({}),
    },
  },
}));

describe('Supplier webhook auth', () => {
  const app = createApp();
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      AETHER_API_KEY: 'test-api-key',
      SUPPLIER_WEBHOOK_SECRET: 'supplier-secret',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns 403 when X-Webhook-Secret is missing but API key bypasses auth', async () => {
    const res = await request(app)
      .post('/api/suppliers/webhook')
      .set('X-Aether-Api-Key', 'test-api-key')
      .send({ products: [{ sku: 'H-ABC', name: 'Widget', price: 9.99 }] });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/webhook secret/i);
  });

  it('returns 403 when X-Webhook-Secret is wrong', async () => {
    const res = await request(app)
      .post('/api/suppliers/webhook')
      .set('X-Webhook-Secret', 'wrong')
      .send({ products: [{ sku: 'H-ABC', name: 'Widget', price: 9.99 }] });
    expect(res.status).toBe(401);
  });

  it('accepts webhook with valid secret and payload', async () => {
    const res = await request(app)
      .post('/api/suppliers/webhook')
      .set('X-Webhook-Secret', 'supplier-secret')
      .send({ products: [{ sku: 'H-ABC', name: 'Widget', price: 9.99 }] });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.productsReceived).toBe(1);
  });
});
