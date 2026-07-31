import express from 'express';
import request from 'supertest';
import promotionsRouter from '../index';

const listPromotions = { execute: jest.fn() };
const createPromotion = { execute: jest.fn() };

jest.mock('../../../bootstrap/compositionRoot', () => ({
  getCompositionRoot: () => ({
    listPromotions,
    createPromotion,
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
  app.use('/api/promotions', promotionsRouter);
  return app;
}

describe('Promotions HTTP (P12)', () => {
  const app = createTestApp();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET / lists promotions for tenant', async () => {
    listPromotions.execute.mockResolvedValue({
      status: 'partial',
      promotions: [
        {
          id: 'promo_1',
          tenantId: 'tenant_a',
          name: 'Summer sale',
          type: 'percent',
          value: 10,
          status: 'draft',
        },
      ],
    });

    const res = await request(app).get('/api/promotions').set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('partial');
    expect(res.body.promotions).toHaveLength(1);
    expect(listPromotions.execute).toHaveBeenCalledWith('tenant_a');
  });

  it('POST / creates a draft promotion', async () => {
    createPromotion.execute.mockResolvedValue({
      status: 'partial',
      promotion: {
        id: 'promo_2',
        tenantId: 'tenant_a',
        name: 'Clearance',
        type: 'percent',
        value: 15,
        status: 'draft',
      },
    });

    const res = await request(app)
      .post('/api/promotions')
      .set('X-Test-Tenant', 'tenant_a')
      .send({ name: 'Clearance', type: 'percent', value: 15 });

    expect(res.status).toBe(201);
    expect(res.body.promotion.name).toBe('Clearance');
    expect(createPromotion.execute).toHaveBeenCalledWith(
      'tenant_a',
      expect.objectContaining({ name: 'Clearance', type: 'percent', value: 15 })
    );
  });

  it('POST / rejects missing name', async () => {
    const res = await request(app)
      .post('/api/promotions')
      .set('X-Test-Tenant', 'tenant_a')
      .send({ value: 10 });

    expect(res.status).toBe(400);
    expect(createPromotion.execute).not.toHaveBeenCalled();
  });
});
