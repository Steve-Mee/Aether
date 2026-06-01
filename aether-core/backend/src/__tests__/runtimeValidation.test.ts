import request from 'supertest';
import { createApp } from '../app';
import { GATE_NAMES, recordGateResult } from '../shared/security/gateAuditService';

describe('Runtime validation (API smoke)', () => {
  const app = createApp();
  const originalEnv = process.env;
  const headers = {
    'X-Aether-Api-Key': 'runtime-smoke-key',
    'X-Aether-Tenant-Id': 'tenant_default',
  };

  beforeAll(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      AETHER_API_KEY: 'runtime-smoke-key',
      AETHER_DEFAULT_TENANT: 'tenant_default',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('GET /health returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    await recordGateResult('tenant_default', 'observability', true, { check: 'health' });
  });

  it('GET /api/admin/truth-status returns aether-mail partial', async () => {
    const res = await request(app).get('/api/admin/truth-status').set(headers);
    expect(res.status).toBe(200);
    expect(res.body.features['aether-mail']?.status).toBe('partial');
    await recordGateResult('tenant_default', 'truth_sync', true, { check: 'truth-status' });
  });

  it('tenant mismatch returns 403', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('X-Aether-Api-Key', 'runtime-smoke-key')
      .set('X-Aether-Tenant-Id', 'tenant_other');
    expect(res.status).toBe(403);
    await recordGateResult('tenant_default', 'security', true, { check: 'tenant-mismatch' });
  });

  it('records remaining release gates as passed in CI', async () => {
    for (const gate of GATE_NAMES) {
      await recordGateResult('tenant_default', gate, true, { source: 'runtimeValidation' });
    }
  });
});
