import express from 'express';
import request from 'supertest';
import customersRouter from '../index';

const listCustomers = { execute: jest.fn() };
const getCustomer = { execute: jest.fn() };
const listCustomerOrders = { execute: jest.fn() };

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    listCustomers,
    getCustomer,
    listCustomerOrders,
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
  app.use('/api/customers', customersRouter);
  return app;
}

describe('Customers HTTP (P11)', () => {
  const app = createTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET / lists customers for tenant', async () => {
    listCustomers.execute.mockResolvedValue({
      customers: [
        {
          id: 'cust_1',
          email: 'ada@example.com',
          name: 'Ada L',
          segment: 'vip',
          orderCount: 3,
          totalSpent: 240,
          lastOrderAt: '2026-07-01T00:00:00.000Z',
        },
      ],
    });

    const res = await request(app).get('/api/customers').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.customers).toHaveLength(1);
    expect(listCustomers.execute).toHaveBeenCalledWith('tenant_a');
  });

  it('GET /:id returns 404 across tenants', async () => {
    getCustomer.execute.mockResolvedValue(null);

    const res = await request(app).get('/api/customers/cust_x').set('X-Test-Tenant', 'tenant_b');

    expect(res.status).toBe(404);
    expect(getCustomer.execute).toHaveBeenCalledWith('tenant_b', 'cust_x');
  });

  it('GET /:id/orders returns customer orders', async () => {
    getCustomer.execute.mockResolvedValue({
      id: 'cust_1',
      email: 'ada@example.com',
      name: 'Ada L',
    });
    listCustomerOrders.execute.mockResolvedValue({
      orders: [{ id: 'ord_1', status: 'paid', total: 100, customerId: 'cust_1' }],
    });

    const res = await request(app)
      .get('/api/customers/cust_1/orders')
      .set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.orders).toHaveLength(1);
  });
});
