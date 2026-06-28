import { signAccessToken, verifyAccessToken } from '../jwtService';

describe('jwtService', () => {
  const prev = process.env.AETHER_JWT_SECRET;

  beforeAll(() => {
    process.env.AETHER_JWT_SECRET = 'test-secret-min-16-chars';
  });

  afterAll(() => {
    process.env.AETHER_JWT_SECRET = prev;
  });

  it('round-trips access token payload', () => {
    const token = signAccessToken({
      sub: 'user-1',
      tenantId: 'tenant_default',
      role: 'admin',
      email: 'admin@aether.local',
    });
    const payload = verifyAccessToken(token);
    expect(payload).toMatchObject({
      sub: 'user-1',
      tenantId: 'tenant_default',
      role: 'admin',
      email: 'admin@aether.local',
    });
  });

  it('returns null for invalid token', () => {
    expect(verifyAccessToken('not-a-jwt')).toBeNull();
  });
});
