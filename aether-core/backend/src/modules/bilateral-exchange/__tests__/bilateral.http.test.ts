import express from 'express';
import request from 'supertest';
import bilateralRouter from '../index';

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    bilateralExchangeService: {
      listSchemas: jest.fn().mockResolvedValue([
        {
          id: 's1',
          schemaKey: 'inventory_turnover_band',
          fields: ['product_count_band'],
          description: 'Inventory bands',
        },
      ]),
      listContracts: jest.fn().mockResolvedValue([
        {
          id: 'c1',
          status: 'pending',
          role: 'provider',
          partnerName: 'Partner',
          partnerSlug: 'partner',
          schemaKey: 'inventory_turnover_band',
        },
      ]),
      proposeContract: jest.fn().mockResolvedValue({ id: 'c-new', status: 'pending' }),
      acceptContract: jest.fn().mockResolvedValue({ id: 'c1', status: 'active' }),
      publishPackage: jest.fn().mockResolvedValue({ id: 'p1', fieldCount: 1 }),
      listPackages: jest.fn().mockResolvedValue([{ id: 'p1', fieldCount: 1, expired: false }]),
      consumePackage: jest.fn().mockResolvedValue({ packageId: 'p1', fields: ['product_count_band'] }),
      revokeContract: jest.fn().mockResolvedValue(undefined),
      getContract: jest.fn(),
      listContractAudit: jest.fn().mockResolvedValue([]),
    },
  }),
}));

jest.mock('../../../shared/security/rbac', () => ({
  requireViewer: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    _req.tenantId = 'tenant_default';
    _req.actorId = 'actor_1';
    next();
  },
  requireOperator: (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    _req.tenantId = 'tenant_default';
    _req.actorId = 'actor_1';
    next();
  },
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use((err: Error & { statusCode?: number }, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = err.statusCode ?? 500;
    res.status(status).json({ error: err.message });
    next();
  });
  app.use('/api/bilateral', bilateralRouter);
  return app;
}

describe('bilateral exchange HTTP', () => {
  it('GET /api/bilateral/schemas returns schemas', async () => {
    const res = await request(createTestApp()).get('/api/bilateral/schemas');
    expect(res.status).toBe(200);
    expect(res.body.schemas).toHaveLength(1);
  });

  it('POST /api/bilateral/contracts accepts slug propose', async () => {
    const res = await request(createTestApp())
      .post('/api/bilateral/contracts')
      .send({
        consumerTenantSlug: 'partner-shop',
        schemaKey: 'inventory_turnover_band',
        allowedFields: ['product_count_band'],
      });
    expect(res.status).toBe(201);
    expect(res.body.id).toBe('c-new');
  });

  it('POST /api/bilateral/contracts/:id/accept accepts contract', async () => {
    const res = await request(createTestApp()).post('/api/bilateral/contracts/c1/accept');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
  });

  it('GET /api/bilateral/contracts/:id/packages lists packages', async () => {
    const res = await request(createTestApp()).get('/api/bilateral/contracts/c1/packages');
    expect(res.status).toBe(200);
    expect(res.body.packages).toHaveLength(1);
  });

  it('POST /api/bilateral/packages/consume consumes package', async () => {
    const res = await request(createTestApp())
      .post('/api/bilateral/packages/consume')
      .send({ packageId: 'p1' });
    expect(res.status).toBe(200);
    expect(res.body.packageId).toBe('p1');
  });
});
