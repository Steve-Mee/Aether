import express from 'express';
import request from 'supertest';
import orderRouter from '../index';

const orderDetail = {
  id: 'ord_1',
  customerId: 'cust_1',
  status: 'paid',
  total: 100,
  currency: 'EUR',
  createdAt: new Date('2026-07-26T08:00:00.000Z'),
  updatedAt: new Date('2026-07-26T08:00:00.000Z'),
  items: [{ id: 'oi_1', productId: 'prod_a', quantity: 1, price: 100 }],
  customer: { id: 'cust_1', email: 'ada@example.com', name: 'Ada L' },
  shipments: [],
  refunds: [],
  payment: { id: 'pay_1', status: 'paid', amount: 100, paymentMethod: 'stripe' },
};

const getOrderDetail = { execute: jest.fn() };
const shipOrder = { execute: jest.fn() };
const createOrderRefund = { execute: jest.fn() };
const createOrder = { execute: jest.fn() };
const updateOrderStatus = { execute: jest.fn() };
const orderRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
};

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    getOrderDetail,
    shipOrder,
    createOrderRefund,
    createOrder,
    updateOrderStatus,
    orderRepository,
  }),
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
  app.use('/api/orders', orderRouter);
  return app;
}

describe('Orders HTTP (P11)', () => {
  const app = createTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /:id returns enriched order detail', async () => {
    getOrderDetail.execute.mockResolvedValue(orderDetail);

    const res = await request(app).get('/api/orders/ord_1').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.customer.email).toBe('ada@example.com');
    expect(res.body.payment.id).toBe('pay_1');
    expect(getOrderDetail.execute).toHaveBeenCalledWith('tenant_a', 'ord_1');
  });

  it('GET /:id returns 404 for other tenant', async () => {
    getOrderDetail.execute.mockResolvedValue(null);

    const res = await request(app).get('/api/orders/ord_1').set('X-Test-Tenant', 'tenant_b');

    expect(res.status).toBe(404);
    expect(getOrderDetail.execute).toHaveBeenCalledWith('tenant_b', 'ord_1');
  });

  it('POST /:id/ship creates shipment', async () => {
    shipOrder.execute.mockResolvedValue({
      shipment: {
        id: 'ship_1',
        status: 'shipped',
        carrier: 'PostNL',
        trackingNumber: '3S123',
        shippedAt: new Date(),
        createdAt: new Date(),
      },
      order: { ...orderDetail, status: 'shipped' },
    });

    const res = await request(app)
      .post('/api/orders/ord_1/ship')
      .set('X-Test-Tenant', 'tenant_a')
      .send({ carrier: 'PostNL', trackingNumber: '3S123' });

    expect(res.status).toBe(201);
    expect(res.body.shipment.carrier).toBe('PostNL');
  });

  it('POST /:id/refunds creates approval when required', async () => {
    createOrderRefund.execute.mockResolvedValue({
      refund: {
        id: 'ref_1',
        amount: 100,
        currency: 'EUR',
        status: 'pending',
        reason: 'customer request',
        createdAt: new Date(),
      },
      approval: { id: 'appr_1', status: 'pending' },
    });

    const res = await request(app)
      .post('/api/orders/ord_1/refunds')
      .set('X-Test-Tenant', 'tenant_a')
      .send({ amount: 100, reason: 'customer request' });

    expect(res.status).toBe(201);
    expect(res.body.approval.id).toBe('appr_1');
    expect(res.body.refund.status).toBe('pending');
    expect(createOrderRefund.execute).toHaveBeenCalledWith(
      'tenant_a',
      'ord_1',
      { amount: 100, reason: 'customer request' },
      'actor_1'
    );
  });
});
