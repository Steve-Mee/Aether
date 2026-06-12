import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createStubAuthAdapter } from '../adapters/stubAuthAdapter';

describe('stubAuthAdapter', () => {
  const storage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
    vi.stubGlobal('localStorage', {
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
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips signIn, restore, and signOut', async () => {
    const adapter = createStubAuthAdapter();

    expect(await adapter.restoreSession()).toBeNull();

    const session = await adapter.signIn({ email: 'admin@aether.local' });
    expect(session.isAuthenticated).toBe(true);
    expect(session.user.name).toBe('Steve');
    expect(session.user.role).toBe('admin');

    const restored = await adapter.restoreSession();
    expect(restored?.user.email).toBe('admin@aether.local');

    await adapter.signOut();
    expect(await adapter.restoreSession()).toBeNull();
  });

  it('falls back to default persona for unknown email', async () => {
    const adapter = createStubAuthAdapter();
    const session = await adapter.signIn({ email: 'unknown@example.com' });
    expect(session.user.role).toBe('admin');
    expect(session.user.email).toBe('admin@aether.local');
  });
});
