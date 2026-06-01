import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../../app';

describe('RBAC viewer read routes', () => {
  let app: Express;
  const originalApiKey = process.env.AETHER_API_KEY;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeAll(() => {
    delete process.env.AETHER_API_KEY;
    process.env.NODE_ENV = 'test';
    process.env.AETHER_TEST_AUTH_BYPASS = 'true';
    app = createApp();
  });

  afterAll(() => {
    if (originalApiKey) process.env.AETHER_API_KEY = originalApiKey;
    else delete process.env.AETHER_API_KEY;
    delete process.env.AETHER_TEST_AUTH_BYPASS;
    process.env.NODE_ENV = originalNodeEnv;
  });

  const viewerHeaders = {
    'X-Aether-Tenant-Id': 'tenant_default',
    'X-Aether-Actor-Id': 'viewer-test',
    'X-Aether-Role': 'viewer',
  };

  const operatorHeaders = {
    'X-Aether-Tenant-Id': 'tenant_default',
    'X-Aether-Actor-Id': 'operator-test',
    'X-Aether-Role': 'operator',
  };

  it('viewer can access read-only GET routes', async () => {
    const readRoutes = [
      '/api/products',
      '/api/orders',
      '/api/emails',
      '/api/suppliers',
      '/api/agentic/negotiations',
      '/api/hive-mind/insights/aggregated',
      '/api/approvals',
      '/api/outcomes/report',
      '/api/inventory/low-stock',
    ];

    for (const route of readRoutes) {
      const res = await request(app).get(route).set(viewerHeaders);
      expect(res.status).not.toBe(403);
    }
  });

  it('viewer cannot create products', async () => {
    const res = await request(app)
      .post('/api/products')
      .set(viewerHeaders)
      .send({ name: 'Blocked', slug: 'blocked', price: 1, stock: 1 });

    expect(res.status).toBe(403);
  });

  it('operator can process emails', async () => {
    const res = await request(app)
      .post('/api/emails/process')
      .set(operatorHeaders)
      .send({ from: 'test@example.com', subject: 'Hi', body: 'Hello' });

    expect(res.status).not.toBe(403);
  });
});
