import { getRedisClient } from '../../../shared/redis/createRedisClient';
import { logger } from '../../../shared/logging/logger';

const TTL_SEC = 600;
const KEY_PREFIX = 'oidc:session:';

export interface OidcSession {
  state: string;
  nonce: string;
  codeVerifier: string;
  tenantId: string;
  createdAt: number;
}

const fallbackSessions = new Map<string, OidcSession>();
let redisFallbackLogged = false;

function logRedisFallback(reason: string): void {
  if (redisFallbackLogged) return;
  redisFallbackLogged = true;
  logger.warn('oidc_session_store_redis_unavailable', { fallback: 'in-memory', reason });
}

function pruneFallbackSessions(): void {
  const now = Date.now();
  const maxAge = TTL_SEC * 1000;
  for (const [key, session] of fallbackSessions.entries()) {
    if (now - session.createdAt > maxAge) {
      fallbackSessions.delete(key);
    }
  }
}

setInterval(() => pruneFallbackSessions(), 10 * 60 * 1000);

export async function storeOidcSession(state: string, session: OidcSession): Promise<void> {
  const client = await getRedisClient();
  if (client) {
    try {
      await client.setEx(`${KEY_PREFIX}${state}`, TTL_SEC, JSON.stringify(session));
      return;
    } catch (err) {
      logRedisFallback(err instanceof Error ? err.message : 'set_failed');
    }
  } else {
    logRedisFallback('redis_not_configured');
  }

  fallbackSessions.set(state, session);
}

export async function consumeOidcSession(state: string): Promise<OidcSession | null> {
  const client = await getRedisClient();
  if (client) {
    try {
      const key = `${KEY_PREFIX}${state}`;
      const raw = await client.get(key);
      if (raw) {
        await client.del(key);
        return JSON.parse(raw) as OidcSession;
      }
    } catch (err) {
      logRedisFallback(err instanceof Error ? err.message : 'get_failed');
    }
  }

  const session = fallbackSessions.get(state) ?? null;
  if (session) fallbackSessions.delete(state);
  return session;
}
