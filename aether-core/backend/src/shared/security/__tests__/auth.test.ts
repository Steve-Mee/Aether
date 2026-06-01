import crypto from 'crypto';
import { resolveApiKeyRole } from '../auth';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

describe('auth', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, AETHER_API_KEY: 'test-secret-key', AETHER_DEFAULT_TENANT: 'tenant_default' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('resolveApiKeyRole returns admin for matching env key', async () => {
    const result = await resolveApiKeyRole('test-secret-key');
    expect(result).toEqual({ role: 'admin', tenantId: 'tenant_default' });
  });

  it('resolveApiKeyRole returns null for invalid key', async () => {
    const result = await resolveApiKeyRole('wrong-key');
    expect(result).toBeNull();
  });

  it('hashKey produces stable sha256', () => {
    expect(hashKey('abc')).toHaveLength(64);
  });
});
