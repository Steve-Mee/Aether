import express from 'express';
import request from 'supertest';
import inventoryRouter from '../index';

const listInventory = { execute: jest.fn() };
const adjustInventory = { execute: jest.fn() };
const updateInventory = { execute: jest.fn() };
const applyDynamicPrice = { execute: jest.fn() };
const adminData = { listLowStockInventory: jest.fn() };

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    listInventory,
    adjustInventory,
    updateInventory,
    applyDynamicPrice,
    adminData,
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
  app.use('/api/inventory', inventoryRouter);
  return app;
}

describe('Inventory HTTP (P11)', () => {
  const app = createTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET / lists inventory for tenant', async () => {
    listInventory.execute.mockResolvedValue({
      items: [
        {
          id: 'inv_1',
          productId: 'prod_a',
          warehouseId: 'default',
          quantity: 2,
          productName: 'Kom Aarde',
          productSlug: 'kom-aarde',
          threshold: 5,
          status: 'low',
        },
      ],
    });

    const res = await request(app).get('/api/inventory').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.items[0].status).toBe('low');
    expect(listInventory.execute).toHaveBeenCalledWith('tenant_a');
  });

  it('GET /low-stock remains available', async () => {
    adminData.listLowStockInventory.mockResolvedValue([
      { id: 'inv_1', productId: 'prod_a', quantity: 1, warehouseId: 'default' },
    ]);

    const res = await request(app).get('/api/inventory/low-stock').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.lowStockProducts).toHaveLength(1);
  });

  it('POST /adjust updates stock', async () => {
    adjustInventory.execute.mockResolvedValue({
      productId: 'prod_a',
      warehouseId: 'default',
      quantity: 20,
    });

    const res = await request(app)
      .post('/api/inventory/adjust')
      .set('X-Test-Tenant', 'tenant_a')
      .send({ productId: 'prod_a', quantity: 20 });

    expect(res.status).toBe(200);
    expect(res.body.adjustment.quantity).toBe(20);
    expect(adjustInventory.execute).toHaveBeenCalledWith('tenant_a', {
      productId: 'prod_a',
      quantity: 20,
    });
  });

  it('tenant isolation: listInventory called with request tenant', async () => {
    listInventory.execute.mockResolvedValue({ items: [] });

    await request(app).get('/api/inventory').set('X-Test-Tenant', 'tenant_b');

    expect(listInventory.execute).toHaveBeenCalledWith('tenant_b');
  });
});
