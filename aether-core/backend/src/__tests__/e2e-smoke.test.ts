import request from 'supertest';
import { createApp } from '../app';

describe('E2E smoke — auth + validation chain', () => {
  const app = createApp();
  const originalEnv = process.env;
  const headers = {
    'X-Aether-Api-Key': 'smoke-test-key',
    'X-Aether-Tenant-Id': 'tenant_default',
  };

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      AETHER_API_KEY: 'smoke-test-key',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('health → auth gate → Zod validation on mail process', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);

    const unauth = await request(app).post('/api/emails/process').send({ from: 'a@b.com' });
    expect(unauth.status).toBe(401);

    const invalid = await request(app)
      .post('/api/emails/process')
      .set(headers)
      .send({ from: 'not-an-email' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error).toMatch(/Validation/i);
  });
});
