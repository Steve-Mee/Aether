import express from 'express';
import request from 'supertest';
import paymentRouter from '../index';

const listByTenant = jest.fn();
const reconcileBillingRecords = jest.fn();

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    paymentRepository: { listByTenant },
    paymentService: {},
    processPayment: { execute: jest.fn() },
    fulfillmentService: {},
    persistFulfillment: {},
  }),
}));

jest.mock('../../../shared/billing/billingService', () => ({
  reconcileBillingRecords: (...args: unknown[]) => reconcileBillingRecords(...args),
}));

jest.mock('../infrastructure/providers/PaymentProvider', () => ({
  verifyStripeWebhook: jest.fn(),
  createStripeConnectOnboardingLink: jest.fn(),
}));

jest.mock('../../../shared/security/rbac', () => ({
  requireViewer: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.tenantId = (req.header('X-Test-Tenant') as string) || 'tenant_a';
    req.actorId = 'actor_1';
    next();
  },
  requireOperator: (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    req.tenantId = (req.header('X-Test-Tenant') as string) || 'tenant_a';
    req.actorId = 'actor_1';
    next();
  },
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/payments', paymentRouter);
  return app;
}

describe('Payments admin HTTP (P12)', () => {
  const app = createTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.STRIPE_CONNECT_ACCOUNT_ID;
  });

  it('GET / list returns tenant payment transactions', async () => {
    listByTenant.mockResolvedValue([
      {
        id: 'p1',
        orderId: 'o1',
        amount: 40,
        currency: 'EUR',
        status: 'paid',
        paymentMethod: 'card',
        transactionId: 'txn_1',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        updatedAt: new Date('2026-07-01T00:00:00.000Z'),
      },
    ]);

    const res = await request(app).get('/api/payments').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('partial');
    expect(res.body.payments).toHaveLength(1);
    expect(res.body.payments[0].id).toBe('p1');
    expect(res.body.payments[0].orderId).toBe('o1');
    expect(listByTenant).toHaveBeenCalledWith('tenant_a');
  });

  it('GET /summary aggregates tenant payments', async () => {
    listByTenant.mockResolvedValue([
      { id: 'p1', orderId: 'o1', amount: 40, status: 'paid', paymentMethod: 'card' },
      { id: 'p2', orderId: 'o2', amount: 10, status: 'failed', paymentMethod: 'card' },
      { id: 'p3', orderId: 'o3', amount: 5, status: 'pending', paymentMethod: 'card' },
    ]);

    const res = await request(app).get('/api/payments/summary').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('partial');
    expect(res.body.paidAmount).toBe(40);
    expect(res.body.failedCount).toBe(1);
    expect(res.body.byStatus.pending).toBe(1);
    expect(listByTenant).toHaveBeenCalledWith('tenant_a');
  });

  it('GET /payouts returns honest empty partial ledger', async () => {
    const res = await request(app).get('/api/payments/payouts').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('partial');
    expect(res.body.payouts).toEqual([]);
    expect(typeof res.body.message).toBe('string');
    expect(String(res.body.message).toLowerCase()).not.toMatch(/live payout|production payout/);
  });

  it('POST /reconcile wraps outcome billing only', async () => {
    reconcileBillingRecords.mockResolvedValue({ reconciled: 2, pending: 0 });

    const res = await request(app).post('/api/payments/reconcile').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('partial');
    expect(res.body.kind).toBe('outcome_billing');
    expect(res.body.reconciled).toBe(2);
    expect(String(res.body.message ?? '').toLowerCase()).toMatch(/outcome billing|not psp|not.*live payout/);
    expect(reconcileBillingRecords).toHaveBeenCalledWith('tenant_a');
  });

  it('GET /summary never claims live billing status', async () => {
    listByTenant.mockResolvedValue([]);

    const res = await request(app).get('/api/payments/summary').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('partial');
    expect(res.body.status).not.toBe('live');
  });
});

