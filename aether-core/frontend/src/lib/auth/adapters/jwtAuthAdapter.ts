import { env } from '@/lib/config';
import { loginResponseToSession, sessionResponseToSession } from '@/types/auth';
import type { AuthPort, SignInInput } from '../AuthPort';
import { authApi } from '../authApi';
import {
  clearPersistedSession,
  readPersistedSession,
  writePersistedSession,
} from '../sessionStorage';
import type { Session } from '../types';

export async function refreshJwtAccessToken(): Promise<string | null> {
  try {
    const response = await authApi.refresh();
    const session = loginResponseToSession(response);
    writePersistedSession(session);
    return session.accessToken;
  } catch {
    clearPersistedSession();
    return null;
  }
}

async function restoreFromRefresh(): Promise<Session | null> {
  const token = await refreshJwtAccessToken();
  if (!token) return null;
  const persisted = readPersistedSession();
  return persisted;
}

export function createJwtAuthAdapter(): AuthPort {
  return {
    async restoreSession(): Promise<Session | null> {
      const persisted = readPersistedSession();
      if (persisted?.accessToken) {
        try {
          const remote = await authApi.session(persisted.accessToken);
          const session = sessionResponseToSession(remote, persisted.accessToken);
          writePersistedSession(session);
          return session;
        } catch {
          // Access token expired — fall through to refresh cookie
        }
      }

      return restoreFromRefresh();
    },

    async signIn(credentials: SignInInput): Promise<Session> {
      if (!credentials.password) {
        throw new Error('Password required');
      }
      const response = await authApi.login({
        email: credentials.email,
        password: credentials.password,
        tenantId: env.tenantId,
      });
      const session = loginResponseToSession(response);
      writePersistedSession(session);
      return session;
    },

    async signOut(): Promise<void> {
      const persisted = readPersistedSession();
      try {
        await authApi.logout(persisted?.accessToken ?? null);
      } catch {
        // Client session clear proceeds even when logout endpoint fails
      }
      clearPersistedSession();
    },
  };
}
