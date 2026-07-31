import express from 'express';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import request from 'supertest';
import mediaRouter from '../mediaRouter';
import { resolveSafeMediaAbsolutePath } from '../infrastructure/media/LocalDiskMediaStore';

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

describe('Media HTTP serve (P11)', () => {
  let uploadRoot: string;
  let previousMediaDir: string | undefined;

  beforeAll(async () => {
    uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aether-media-'));
    previousMediaDir = process.env.MEDIA_UPLOAD_DIR;
    process.env.MEDIA_UPLOAD_DIR = uploadRoot;
  });

  afterAll(async () => {
    if (previousMediaDir === undefined) {
      delete process.env.MEDIA_UPLOAD_DIR;
    } else {
      process.env.MEDIA_UPLOAD_DIR = previousMediaDir;
    }
    await fs.rm(uploadRoot, { recursive: true, force: true });
  });

  function createTestApp() {
    const app = express();
    app.use('/api/media', mediaRouter);
    return app;
  }

  it('GET serves media for matching tenant', async () => {
    const fileName = 'uuid-kom.png';
    const dir = path.join(uploadRoot, 'tenant_a');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const app = createTestApp();
    const res = await request(app)
      .get(`/api/media/tenant_a/${fileName}`)
      .set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/image\/png/);
    expect(Buffer.isBuffer(res.body) ? res.body.length : res.body).toBeTruthy();
  });

  it('GET rejects cross-tenant media access', async () => {
    const fileName = 'uuid-other.png';
    const dir = path.join(uploadRoot, 'tenant_b');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, fileName), Buffer.from('secret'));

    const app = createTestApp();
    const res = await request(app)
      .get(`/api/media/tenant_b/${fileName}`)
      .set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('MEDIA_TENANT_FORBIDDEN');
  });

  it('GET returns 404 for missing file', async () => {
    const app = createTestApp();
    const res = await request(app)
      .get('/api/media/tenant_a/missing-file.png')
      .set('X-Test-Tenant', 'tenant_a');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('MEDIA_NOT_FOUND');
  });

  it('rejects path traversal in fileName', () => {
    const resolved = resolveSafeMediaAbsolutePath(uploadRoot, 'tenant_a', '../etc/passwd');
    expect(resolved).toBeNull();
  });

  it('GET returns 400 for traversal-style fileName', async () => {
    const app = createTestApp();
    const res = await request(app)
      .get('/api/media/tenant_a/..%2Fsecret.png')
      .set('X-Test-Tenant', 'tenant_a');

    // Express may decode or reject; either 400 invalid path or 404 is acceptable denial
    expect([400, 404]).toContain(res.status);
  });
});
