import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../../app';

describe('Tenant isolation', () => {
  let app: Express;
  const originalEnv = process.env;

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      AETHER_API_KEY: 'tenant-isolation-key',
      AETHER_DEFAULT_TENANT: 'tenant_default',
    };
    app = createApp();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects tenant header that does not match API key tenant', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('X-Aether-Api-Key', 'tenant-isolation-key')
      .set('X-Aether-Tenant-Id', 'tenant_other');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/tenant/i);
  });

  it('allows request when tenant header matches default tenant', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('X-Aether-Api-Key', 'tenant-isolation-key')
      .set('X-Aether-Tenant-Id', 'tenant_default');

    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });
});
