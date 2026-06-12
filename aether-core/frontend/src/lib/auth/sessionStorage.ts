import type { Session } from './types';

const STORAGE_KEY = 'aether.session.v1';

export interface PersistedSession {
  tenantId: string;
  merchantName: string;
  user: Session['user'];
  accessToken: string | null;
}

function isValidPersisted(value: unknown): value is PersistedSession {
  if (!value || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  if (typeof o.tenantId !== 'string' || typeof o.merchantName !== 'string') return false;
  if (!o.user || typeof o.user !== 'object') return false;
  const user = o.user as Record<string, unknown>;
  if (
    typeof user.id !== 'string' ||
    typeof user.name !== 'string' ||
    typeof user.role !== 'string'
  ) {
    return false;
  }
  const role = user.role as string;
  if (role !== 'admin' && role !== 'operator' && role !== 'viewer') return false;
  return true;
}

export function toPersisted(session: Session): PersistedSession {
  return {
    tenantId: session.tenantId,
    merchantName: session.merchantName,
    user: session.user,
    accessToken: session.accessToken,
  };
}

export function fromPersisted(data: PersistedSession): Session {
  return {
    tenantId: data.tenantId,
    merchantName: data.merchantName,
    user: data.user,
    accessToken: data.accessToken ?? null,
    isAuthenticated: true,
  };
}

function readRaw(): string | null {
  return sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY);
}

function writeRaw(value: string): void {
  sessionStorage.setItem(STORAGE_KEY, value);
  localStorage.removeItem(STORAGE_KEY);
}

function removeRaw(): void {
  sessionStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_KEY);
}

export function readPersistedSession(): Session | null {
  try {
    const raw = readRaw();
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidPersisted(parsed)) {
      clearPersistedSession();
      return null;
    }
    const session = fromPersisted(parsed);
    if (
      sessionStorage.getItem(STORAGE_KEY) === null &&
      localStorage.getItem(STORAGE_KEY) !== null
    ) {
      writeRaw(raw);
    }
    return session;
  } catch {
    clearPersistedSession();
    return null;
  }
}

export function writePersistedSession(session: Session): void {
  writeRaw(JSON.stringify(toPersisted(session)));
}

export function clearPersistedSession(): void {
  removeRaw();
}
