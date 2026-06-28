import request from 'supertest';
import { createApp } from '../../../app';

describe('Auth HTTP', () => {
  const prevSecret = process.env.AETHER_JWT_SECRET;
  const prevBypass = process.env.AETHER_TEST_AUTH_BYPASS;

  beforeAll(() => {
    process.env.AETHER_JWT_SECRET = 'test-secret-min-16-chars';
    process.env.AETHER_TEST_AUTH_BYPASS = 'true';
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env.AETHER_JWT_SECRET = prevSecret;
    process.env.AETHER_TEST_AUTH_BYPASS = prevBypass;
  });

  it('POST /api/auth/login is public and validates body', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login requires password', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@aether.local' });
    expect(res.status).toBe(400);
  });

  it('POST /api/auth/login rejects invalid credentials', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@aether.local', password: 'wrong-password-1' });
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/refresh requires refresh cookie', async () => {
    const app = createApp();
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('GET /api/auth/session requires auth', async () => {
    const prevBypass = process.env.AETHER_TEST_AUTH_BYPASS;
    process.env.AETHER_TEST_AUTH_BYPASS = 'false';

    try {
      const app = createApp();
      const res = await request(app).get('/api/auth/session');
      expect(res.status).toBe(401);
    } finally {
      process.env.AETHER_TEST_AUTH_BYPASS = prevBypass;
    }
  });

  it('GET /api/auth/session accepts Bearer JWT', async () => {
    const prevBypass = process.env.AETHER_TEST_AUTH_BYPASS;
    process.env.AETHER_TEST_AUTH_BYPASS = 'false';

    try {
      const { signAccessToken } = await import('../../../shared/auth/jwtService');
      const token = signAccessToken({
        sub: 'user-test',
        tenantId: 'tenant_default',
        role: 'admin',
        email: 'admin@aether.local',
      });

      const app = createApp();
      const res = await request(app)
        .get('/api/auth/session')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('admin@aether.local');
      expect(res.body.tenantId).toBe('tenant_default');
    } finally {
      process.env.AETHER_TEST_AUTH_BYPASS = prevBypass;
    }
  });
});
