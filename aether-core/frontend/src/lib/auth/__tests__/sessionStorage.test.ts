import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearPersistedSession,
  readPersistedSession,
  writePersistedSession,
} from '../sessionStorage';
import type { Session } from '../types';

const sampleSession: Session = {
  tenantId: 'tenant_test',
  merchantName: 'Test Store',
  user: { id: 'u1', name: 'Steve', email: 'admin@aether.local', role: 'admin' },
  isAuthenticated: true,
  accessToken: 'access-token-1',
};

function createStorageMock(store: Record<string, string>) {
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
    key: () => null,
    length: 0,
  };
}

describe('sessionStorage', () => {
  const storage: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
    const mock = createStorageMock(storage);
    vi.stubGlobal('sessionStorage', mock);
    vi.stubGlobal('localStorage', createStorageMock({}));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists and reads session', () => {
    writePersistedSession(sampleSession);
    const restored = readPersistedSession();
    expect(restored?.user.name).toBe('Steve');
    expect(restored?.tenantId).toBe('tenant_test');
    expect(restored?.accessToken).toBe('access-token-1');
  });

  it('clears corrupt data', () => {
    storage['aether.session.v1'] = '{not-json';
    expect(readPersistedSession()).toBeNull();
    expect(storage['aether.session.v1']).toBeUndefined();
  });

  it('clearPersistedSession removes key', () => {
    writePersistedSession(sampleSession);
    clearPersistedSession();
    expect(readPersistedSession()).toBeNull();
  });
});
