import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createJwtAuthAdapter } from '../adapters/jwtAuthAdapter';

const loginMock = vi.fn();
const refreshMock = vi.fn();
const sessionMock = vi.fn();
const logoutMock = vi.fn();

vi.mock('@/lib/config', () => ({
  env: { tenantId: 'tenant_default' },
}));

vi.mock('../authApi', () => ({
  authApi: {
    login: (...args: unknown[]) => loginMock(...args),
    refresh: (...args: unknown[]) => refreshMock(...args),
    session: (...args: unknown[]) => sessionMock(...args),
    logout: (...args: unknown[]) => logoutMock(...args),
  },
}));

describe('jwtAuthAdapter', () => {
  const storage: Record<string, string> = {};

  beforeEach(() => {
    loginMock.mockReset();
    refreshMock.mockReset();
    sessionMock.mockReset();
    logoutMock.mockReset();
    Object.keys(storage).forEach((k) => delete storage[k]);
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => {
        storage[key] = value;
      },
      removeItem: (key: string) => {
        delete storage[key];
      },
      clear: () => {
        Object.keys(storage).forEach((k) => delete storage[k]);
      },
      key: () => null,
      length: 0,
    });
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => undefined,
      removeItem: () => undefined,
      clear: () => undefined,
      key: () => null,
      length: 0,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('signIn persists JWT session with password', async () => {
    const sessionPayload = {
      tenantId: 'tenant_default',
      merchantName: 'Default Merchant',
      user: {
        id: 'u1',
        name: 'Steve',
        email: 'admin@aether.local',
        role: 'admin' as const,
      },
    };
    loginMock.mockResolvedValue({
      accessToken: 'jwt-token-1',
      expiresIn: 900,
      ...sessionPayload,
    });
    sessionMock.mockResolvedValue(sessionPayload);

    const adapter = createJwtAuthAdapter();
    const session = await adapter.signIn({
      email: 'admin@aether.local',
      password: 'AetherDev2026!',
    });

    expect(session.accessToken).toBe('jwt-token-1');
    expect(session.user.role).toBe('admin');
    expect(await adapter.restoreSession()).not.toBeNull();
    expect(loginMock).toHaveBeenCalledWith({
      email: 'admin@aether.local',
      password: 'AetherDev2026!',
      tenantId: 'tenant_default',
    });
  });

  it('restoreSession falls back to refresh when session endpoint fails', async () => {
    loginMock.mockResolvedValue({
      accessToken: 'jwt-token-2',
      expiresIn: 900,
      tenantId: 'tenant_default',
      merchantName: 'Default Merchant',
      user: {
        id: 'u1',
        name: 'Steve',
        email: 'admin@aether.local',
        role: 'admin',
      },
    });
    sessionMock.mockRejectedValue(new Error('401'));
    refreshMock.mockResolvedValue({
      accessToken: 'jwt-token-refreshed',
      expiresIn: 900,
      tenantId: 'tenant_default',
      merchantName: 'Default Merchant',
      user: {
        id: 'u1',
        name: 'Steve',
        email: 'admin@aether.local',
        role: 'admin',
      },
    });

    const adapter = createJwtAuthAdapter();
    await adapter.signIn({ email: 'admin@aether.local', password: 'AetherDev2026!' });
    const restored = await adapter.restoreSession();
    expect(restored?.accessToken).toBe('jwt-token-refreshed');
    expect(refreshMock).toHaveBeenCalled();
  });

  it('restoreSession clears storage when refresh fails', async () => {
    loginMock.mockResolvedValue({
      accessToken: 'jwt-token-3',
      expiresIn: 900,
      tenantId: 'tenant_default',
      merchantName: 'Default Merchant',
      user: {
        id: 'u1',
        name: 'Steve',
        email: 'admin@aether.local',
        role: 'admin',
      },
    });
    sessionMock.mockRejectedValue(new Error('401'));
    refreshMock.mockRejectedValue(new Error('401'));

    const adapter = createJwtAuthAdapter();
    await adapter.signIn({ email: 'admin@aether.local', password: 'AetherDev2026!' });
    expect(await adapter.restoreSession()).toBeNull();
  });

  it('signOut clears persisted session', async () => {
    loginMock.mockResolvedValue({
      accessToken: 'jwt-token-4',
      expiresIn: 900,
      tenantId: 'tenant_default',
      merchantName: 'Default Merchant',
      user: {
        id: 'u1',
        name: 'Steve',
        email: 'admin@aether.local',
        role: 'admin',
      },
    });
    logoutMock.mockResolvedValue(undefined);

    const adapter = createJwtAuthAdapter();
    await adapter.signIn({ email: 'admin@aether.local', password: 'AetherDev2026!' });
    await adapter.signOut();
    expect(await adapter.restoreSession()).toBeNull();
    expect(logoutMock).toHaveBeenCalledWith('jwt-token-4');
  });
});
