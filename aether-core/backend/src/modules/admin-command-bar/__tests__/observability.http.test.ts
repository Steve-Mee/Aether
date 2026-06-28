import request from 'supertest';
import { createApp } from '../../../app';

describe('admin observability probes', () => {
  const originalEnv = process.env;
  const headers = {
    'X-Aether-Api-Key': 'obs-probe-key',
    'X-Aether-Tenant-Id': 'tenant_default',
  };

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'staging',
      AETHER_API_KEY: 'obs-probe-key',
      AETHER_DEFAULT_TENANT: 'tenant_default',
      SENTRY_ENV: 'staging',
      APP_VERSION: 'probe-release-1',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('GET /api/admin/observability/status returns sentry config summary', async () => {
    const app = createApp();
    const res = await request(app).get('/api/admin/observability/status').set(headers);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      environment: 'staging',
      release: 'probe-release-1',
      probeAllowed: true,
    });
    expect(typeof res.body.sentryActive).toBe('boolean');
  });

  it('POST /api/admin/observability/probe-error returns 500 in staging', async () => {
    const app = createApp();
    const res = await request(app).post('/api/admin/observability/probe-error').set(headers);
    expect(res.status).toBe(500);
  });

  it('POST /api/admin/observability/probe-error returns 403 in production', async () => {
    process.env.NODE_ENV = 'production';
    const app = createApp();
    const res = await request(app).post('/api/admin/observability/probe-error').set(headers);
    expect(res.status).toBe(403);
  });
});
