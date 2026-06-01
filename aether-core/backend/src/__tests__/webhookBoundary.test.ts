import request from 'supertest';
import { createApp } from '../app';
import {
  isGenericPaymentWebhookPath,
  isStripeWebhookPath,
  isSupplierWebhookPath,
  verifyWebhookSecret,
} from '../shared/security/auth';

describe('Webhook path detection', () => {
  it('identifies Stripe webhook path only', () => {
    expect(isStripeWebhookPath('/api/payments/webhook/stripe')).toBe(true);
    expect(isStripeWebhookPath('/api/suppliers/webhook')).toBe(false);
    expect(isStripeWebhookPath('/api/payments/webhook')).toBe(false);
  });

  it('identifies supplier webhook path only', () => {
    expect(isSupplierWebhookPath('/api/suppliers/webhook')).toBe(true);
    expect(isSupplierWebhookPath('/api/payments/webhook/stripe')).toBe(false);
  });

  it('identifies generic payment webhook path', () => {
    expect(isGenericPaymentWebhookPath('/api/payments/webhook')).toBe(true);
    expect(isGenericPaymentWebhookPath('/api/payments/webhook/stripe')).toBe(false);
  });

  it('verifyWebhookSecret rejects mismatch', () => {
    process.env.SUPPLIER_WEBHOOK_SECRET = 'supplier-secret';
    expect(verifyWebhookSecret('wrong', 'SUPPLIER_WEBHOOK_SECRET')).toBe(false);
    expect(verifyWebhookSecret('supplier-secret', 'SUPPLIER_WEBHOOK_SECRET')).toBe(true);
  });
});

describe('Webhook auth boundaries (HTTP)', () => {
  const app = createApp();
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      AETHER_API_KEY: 'test-api-key',
      SUPPLIER_WEBHOOK_SECRET: 'supplier-secret',
      PAYMENT_WEBHOOK_SECRET: 'payment-secret',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects supplier webhook with stripe-signature only (bypass attempt)', async () => {
    const res = await request(app)
      .post('/api/suppliers/webhook')
      .set('stripe-signature', 'sig_fake')
      .send({ products: [] });
    expect(res.status).toBe(401);
  });

  it('rejects supplier webhook with wrong X-Webhook-Secret', async () => {
    const res = await request(app)
      .post('/api/suppliers/webhook')
      .set('X-Webhook-Secret', 'wrong-secret')
      .send({ products: [] });
    expect(res.status).toBe(401);
  });

  it('rejects supplier webhook with valid secret but controller guard when secret env unset', async () => {
    delete process.env.SUPPLIER_WEBHOOK_SECRET;
    const res = await request(app)
      .post('/api/suppliers/webhook')
      .set('X-Webhook-Secret', 'any')
      .send({ products: [] });
    expect(res.status).toBe(401);
  });

  it('accepts supplier webhook with valid secret at auth layer', async () => {
    const res = await request(app)
      .post('/api/suppliers/webhook')
      .set('X-Webhook-Secret', 'supplier-secret')
      .send({ products: [] });
    expect(res.status).not.toBe(401);
  });

  it('rejects generic payment webhook without secret', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ provider: 'local', status: 'paid' });
    expect(res.status).toBe(401);
  });

  it('accepts generic payment webhook with valid payment secret at auth layer', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('X-Webhook-Secret', 'payment-secret')
      .send({ provider: 'local', status: 'paid', transactionId: 'local_txn_1' });
    expect(res.status).not.toBe(401);
  });

  it('rejects stripe webhook with invalid signature at controller', async () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const res = await request(app)
      .post('/api/payments/webhook/stripe')
      .set('stripe-signature', 'invalid')
      .send({ type: 'payment_intent.succeeded' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature/i);
  });
});
