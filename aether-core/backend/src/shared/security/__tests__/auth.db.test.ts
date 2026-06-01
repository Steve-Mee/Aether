jest.mock('../../prisma/client', () => ({
  prisma: {
    apiKey: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '../../prisma/client';
import { resolveApiKeyRole } from '../auth';

describe('resolveApiKeyRole DB-backed keys', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, AETHER_DEFAULT_TENANT: 'tenant_default' };
    delete process.env.AETHER_API_KEY;
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('returns role and tenant from Prisma ApiKey record', async () => {
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      role: 'operator',
      tenantId: 'tenant_acme',
    });

    const result = await resolveApiKeyRole('operator-secret-key');
    expect(result).toEqual({ role: 'operator', tenantId: 'tenant_acme' });
    expect(prisma.apiKey.findUnique).toHaveBeenCalled();
  });

  it('returns viewer role from DB key', async () => {
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      role: 'viewer',
      tenantId: 'tenant_readonly',
    });

    const result = await resolveApiKeyRole('viewer-key');
    expect(result).toEqual({ role: 'viewer', tenantId: 'tenant_readonly' });
  });

  it('returns null when DB key is missing and env key does not match', async () => {
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue(null);
    const result = await resolveApiKeyRole('unknown-key');
    expect(result).toBeNull();
  });

  it('rejects invalid roles from DB', async () => {
    (prisma.apiKey.findUnique as jest.Mock).mockResolvedValue({
      role: 'superuser',
      tenantId: 'tenant_bad',
    });

    const result = await resolveApiKeyRole('bad-role-key');
    expect(result).toBeNull();
  });
});
