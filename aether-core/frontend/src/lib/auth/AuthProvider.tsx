import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { setAuthTenantId, setAuthToken, setOnUnauthorized } from '@/lib/api/client';
import { env } from '@/lib/config';
import { queryClient } from '@/lib/query/client';
import { t } from '@/lib/i18n';
import { getDefaultSignInEmail } from './adapters/stubAuthAdapter';
import { setRefreshAccessToken } from './authRefresh';
import { refreshJwtAccessToken } from './adapters/jwtAuthAdapter';
import { createAuthAdapter } from './createAuthAdapter';
import { readPersistedSession } from './sessionStorage';
import type { SignInInput } from './AuthPort';
import { trackBusinessEvent } from '@/lib/observability/businessEvents';
import type { Session, User } from './types';

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  currentUser: User | null;
  currentTenant: string | null;
  authError: string | null;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function syncApiHeaders(session: Session | null): void {
  if (session?.isAuthenticated) {
    setAuthToken(session.accessToken);
    setAuthTenantId(session.tenantId);
  } else {
    setAuthToken(null);
    setAuthTenantId(null);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const adapter = useMemo(() => createAuthAdapter(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    syncApiHeaders(session);
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        let restored = await adapter.restoreSession();
        if (!restored && env.authAutoLogin) {
          restored = await adapter.signIn({ email: getDefaultSignInEmail() });
        }
        if (!cancelled) setSession(restored);
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
      setAuthToken(null);
      setAuthTenantId(null);
    };
  }, [adapter]);

  const signIn = useCallback(
    async (input: SignInInput) => {
      setAuthError(null);
      setLoading(true);
      try {
        const next = await adapter.signIn(input);
        setSession(next);
        trackBusinessEvent('auth.sign_in', { provider: env.authProvider });
      } catch {
        setAuthError(t('auth.error.signIn'));
        setSession(null);
      } finally {
        setLoading(false);
      }
    },
    [adapter],
  );

  const signOut = useCallback(async () => {
    setAuthError(null);
    try {
      await adapter.signOut();
    } finally {
      trackBusinessEvent('auth.sign_out', { provider: env.authProvider });
      setSession(null);
      syncApiHeaders(null);
      queryClient.clear();
    }
  }, [adapter]);

  useEffect(() => {
    if (env.authProvider !== 'jwt') {
      setOnUnauthorized(null);
      setRefreshAccessToken(null);
      return;
    }
    setRefreshAccessToken(async () => {
      const token = await refreshJwtAccessToken();
      if (token) {
        const persisted = readPersistedSession();
        if (persisted) setSession(persisted);
      }
      return token;
    });
    setOnUnauthorized(() => {
      void signOut();
    });
    return () => {
      setOnUnauthorized(null);
      setRefreshAccessToken(null);
    };
  }, [adapter, signOut]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      isAuthenticated: Boolean(session?.isAuthenticated),
      currentUser: session?.user ?? null,
      currentTenant: session?.tenantId ?? null,
      authError,
      signIn,
      signOut,
    }),
    [session, loading, authError, signIn, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

export function useCurrentUser(): User | null {
  return useAuth().currentUser;
}

/** Safe outside AuthProvider (e.g. tests, optional dashboard stream). */
export function useOptionalCurrentUser(): User | null {
  return useContext(AuthContext)?.currentUser ?? null;
}

export function useCurrentTenant(): string | null {
  return useAuth().currentTenant;
}
