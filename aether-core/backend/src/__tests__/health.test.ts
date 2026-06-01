import request from 'supertest';
import { createApp } from '../app';

describe('AETHER Core API', () => {
  const app = createApp();
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv, NODE_ENV: 'production', AETHER_API_KEY: 'test-secret-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('GET /health returns ok without auth', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.version).toBeDefined();
  });

  it('GET /api/products returns 401 without API key', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(401);
  });

  it('GET /api/products returns 403 with invalid API key', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('X-Aether-Api-Key', 'wrong-key');
    expect(res.status).toBe(403);
  });
});
