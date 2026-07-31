import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { UserRole } from '../../types/express';
import { verifyAccessToken } from '../auth/jwtService';
import { prisma } from '../prisma/client';
import { writeAuditLog } from '../audit/auditService';

const DEFAULT_TENANT = process.env.AETHER_DEFAULT_TENANT ?? 'tenant_default';

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function envKeyMatch(apiKey: string): UserRole | null {
  const expected = process.env.AETHER_API_KEY;
  if (!expected) return null;
  const a = hashKey(apiKey);
  const b = hashKey(expected);
  if (a.length !== b.length) return null;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b)) ? 'admin' : null;
}

/** Stripe webhooks — signature verified in PaymentFulfillmentController. */
export function isStripeWebhookPath(path: string): boolean {
  return /\/payments\/webhook\/stripe$/i.test(path);
}

/** Supplier catalog sync webhooks — require X-Webhook-Secret. */
export function isSupplierWebhookPath(path: string): boolean {
  return /\/suppliers\/webhook$/i.test(path);
}

/** Generic payment provider webhook (non-Stripe) — require PAYMENT_WEBHOOK_SECRET. */
export function isGenericPaymentWebhookPath(path: string): boolean {
  return /\/payments\/webhook$/i.test(path) && !isStripeWebhookPath(path);
}

export function verifyWebhookSecret(
  headerSecret: string | undefined,
  envVar: 'SUPPLIER_WEBHOOK_SECRET' | 'PAYMENT_WEBHOOK_SECRET'
): boolean {
  const secret = process.env[envVar];
  if (!secret || !headerSecret) return false;
  if (headerSecret.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(headerSecret), Buffer.from(secret));
}

function isWebhookRequest(req: Request): boolean {
  const path = req.path;

  if (isStripeWebhookPath(path)) {
    return Boolean(req.header('stripe-signature'));
  }

  if (isSupplierWebhookPath(path)) {
    return verifyWebhookSecret(req.header('X-Webhook-Secret'), 'SUPPLIER_WEBHOOK_SECRET');
  }

  if (isGenericPaymentWebhookPath(path)) {
    return verifyWebhookSecret(req.header('X-Webhook-Secret'), 'PAYMENT_WEBHOOK_SECRET');
  }

  return false;
}

export async function resolveApiKeyRole(
  apiKey: string
): Promise<{ role: UserRole; tenantId: string } | null> {
  const envRole = envKeyMatch(apiKey);
  if (envRole) {
    return { role: envRole, tenantId: DEFAULT_TENANT };
  }

  try {
    const record = await prisma.apiKey.findUnique({
      where: { keyHash: hashKey(apiKey) },
    });
    if (!record) return null;
    const role = record.role as UserRole;
    if (!['admin', 'operator', 'viewer'].includes(role)) return null;
    return { role, tenantId: record.tenantId };
  } catch {
    return null;
  }
}

function isPublicAuthPath(req: Request): boolean {
  return req.method === 'POST' && req.path === '/api/auth/login';
}

/**
 * Public storefront API — slug-scoped; no API key.
 * GET: site/catalog/pages; POST/PATCH/DELETE: carts + checkout (P13).
 */
export function isPublicStorefrontPath(req: Request): boolean {
  const path = req.path || '';
  const original = req.originalUrl?.split('?')[0] ?? '';
  const candidate =
    path.startsWith('/api/storefront')
      ? path
      : original.startsWith('/api/storefront')
        ? original
        : '';
  if (!candidate) return false;

  const method = (req.method || 'GET').toUpperCase();
  if (method === 'GET') {
    return (
      candidate === '/api/storefront' || candidate.startsWith('/api/storefront/')
    );
  }

  // Cart + checkout mutations (tenant slug in path; rate-limited at router).
  if (method === 'POST' || method === 'PATCH' || method === 'DELETE') {
    // /api/storefront/:slug/carts... or /api/storefront/:slug/checkout
    return (
      /^\/api\/storefront\/[^/]+\/carts(\/|$)/.test(candidate) ||
      /^\/api\/storefront\/[^/]+\/checkout\/?$/.test(candidate)
    );
  }

  return false;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  void (async () => {
    if (req.path === '/health') {
      next();
      return;
    }

    if (isPublicAuthPath(req)) {
      next();
      return;
    }

    if (isPublicStorefrontPath(req)) {
      next();
      return;
    }

    if (isWebhookRequest(req)) {
      req.userRole = 'operator';
      req.actorId = 'webhook';
      next();
      return;
    }

    if (
      process.env.AETHER_TEST_AUTH_BYPASS === 'true' &&
      process.env.NODE_ENV === 'test'
    ) {
      req.tenantId = (req.header('X-Aether-Tenant-Id') as string) || DEFAULT_TENANT;
      req.userRole = (req.header('X-Aether-Role') as UserRole) || 'admin';
      req.actorId = req.header('X-Aether-Actor-Id') || 'test-actor';
      next();
      return;
    }

    const bearer = req.header('Authorization');
    if (bearer?.startsWith('Bearer ')) {
      try {
        const payload = verifyAccessToken(bearer.slice(7));
        if (payload) {
          req.tenantId = payload.tenantId;
          req.userRole = payload.role;
          req.actorId = payload.sub;
          req.userEmail = payload.email;
          next();
          return;
        }
      } catch {
        // AETHER_JWT_SECRET unset — fall through to API key auth
      }
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const apiKey = req.header('X-Aether-Api-Key');
    if (!apiKey) {
      res.status(401).json({ error: 'Missing X-Aether-Api-Key header' });
      return;
    }

    const resolved = await resolveApiKeyRole(apiKey);
    if (!resolved) {
      res.status(403).json({ error: 'Invalid API key' });
      return;
    }

    const headerTenant = req.header('X-Aether-Tenant-Id') as string | undefined;
    if (headerTenant && headerTenant !== resolved.tenantId) {
      void writeAuditLog({
        tenantId: resolved.tenantId,
        module: 'security',
        action: 'tenant_access_denied',
        actor: req.header('X-Aether-Actor-Id') || 'api-key-user',
        details: {
          reason: 'api_key_tenant_header_mismatch',
          headerTenant,
          resolvedTenantId: resolved.tenantId,
          path: req.path,
        },
      });
      res.status(403).json({ error: 'Tenant header must match API key tenant' });
      return;
    }

    req.tenantId = resolved.tenantId;
    req.userRole = resolved.role;
    req.actorId = req.header('X-Aether-Actor-Id') || 'api-key-user';
    next();
  })().catch(next);
}
