import crypto from 'crypto';
import request from 'supertest';
import { Express } from 'express';
import { createApp } from '../../../app';
import { prisma } from '../../../shared/prisma/client';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

const describeIfDb = process.env.CI === 'true' ? describe : describe.skip;

describeIfDb('DB-backed ApiKey HTTP auth', () => {
  let app: Express;
  const testKey = `ci-operator-key-${Date.now()}`;
  const originalApiKey = process.env.AETHER_API_KEY;
  const originalNodeEnv = process.env.NODE_ENV;

  jest.setTimeout(30_000);

  beforeAll(async () => {
    delete process.env.AETHER_API_KEY;
    process.env.NODE_ENV = 'test';
    app = createApp();

    await prisma.tenant.upsert({
      where: { slug: 'default' },
      update: {},
      create: { id: 'tenant_default', name: 'Default Merchant', slug: 'default' },
    });

    await prisma.apiKey.create({
      data: {
        tenantId: 'tenant_default',
        keyHash: hashKey(testKey),
        label: 'ci-http-test',
        role: 'operator',
      },
    });
  });

  afterAll(async () => {
    await prisma.apiKey.deleteMany({ where: { label: 'ci-http-test' } });
    if (originalApiKey) process.env.AETHER_API_KEY = originalApiKey;
    else delete process.env.AETHER_API_KEY;
    process.env.NODE_ENV = originalNodeEnv;
  });

  it('accepts Prisma ApiKey with operator role for mutating route', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('X-Aether-Api-Key', testKey)
      .set('X-Aether-Tenant-Id', 'tenant_default')
      .send({
        name: 'DB Key Ok',
        slug: `db-key-ok-${Date.now()}`,
        price: 1,
        stock: 1,
      });

    expect(res.status).not.toBe(403);
    expect(res.status).not.toBe(401);
  });

  it('rejects invalid DB key', async () => {
    const res = await request(app)
      .get('/api/products')
      .set('X-Aether-Api-Key', 'totally-invalid-key')
      .set('X-Aether-Tenant-Id', 'tenant_default');

    expect(res.status).toBe(403);
  });
});
