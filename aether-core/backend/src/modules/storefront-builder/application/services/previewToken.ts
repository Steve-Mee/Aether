import crypto from 'crypto';

/** Locked Appendix G / P04–P09: preview token TTL = 15 minutes. */
export const PREVIEW_TOKEN_TTL_MS = 15 * 60 * 1000;

export interface PreviewTokenClaims {
  revisionId: string;
  projectId: string;
  tenantId: string;
  /** Unix epoch milliseconds */
  exp: number;
}

export class PreviewTokenError extends Error {
  constructor(
    message: string,
    public readonly code: 'PREVIEW_TOKEN_INVALID' | 'PREVIEW_TOKEN_EXPIRED'
  ) {
    super(message);
    this.name = 'PreviewTokenError';
  }
}

function getPreviewHmacSecret(): string {
  const secret = process.env.STOREFRONT_PREVIEW_HMAC_SECRET;
  if (secret && secret.length > 0) return secret;
  if (process.env.NODE_ENV === 'test') {
    return 'test-storefront-preview-hmac-secret';
  }
  throw new Error('STOREFRONT_PREVIEW_HMAC_SECRET is required for preview tokens');
}

function b64url(buf: Buffer | string): string {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, 'utf8');
  return b.toString('base64url');
}

function hmacSign(payloadB64: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payloadB64).digest('base64url');
}

/**
 * Sign a short-lived preview token scoped to a single revision.
 * Exported for P08/P09 preview host + runtime.
 */
export function signPreviewToken(
  claims: Omit<PreviewTokenClaims, 'exp'> & { exp?: number },
  opts?: { ttlMs?: number; nowMs?: number; secret?: string }
): string {
  const now = opts?.nowMs ?? Date.now();
  const exp = claims.exp ?? now + (opts?.ttlMs ?? PREVIEW_TOKEN_TTL_MS);
  const body: PreviewTokenClaims = {
    revisionId: claims.revisionId,
    projectId: claims.projectId,
    tenantId: claims.tenantId,
    exp,
  };
  const payloadB64 = b64url(JSON.stringify(body));
  const sig = hmacSign(payloadB64, opts?.secret ?? getPreviewHmacSecret());
  return `${payloadB64}.${sig}`;
}

/**
 * Verify HMAC + TTL; returns claims or throws PreviewTokenError.
 * Exported for P08/P09 and public storefront page resolution.
 */
export function verifyPreviewToken(
  token: string,
  opts?: { nowMs?: number; secret?: string }
): PreviewTokenClaims {
  if (!token || typeof token !== 'string') {
    throw new PreviewTokenError('Missing preview token', 'PREVIEW_TOKEN_INVALID');
  }

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new PreviewTokenError('Malformed preview token', 'PREVIEW_TOKEN_INVALID');
  }

  const [payloadB64, sig] = parts;
  const secret = opts?.secret ?? getPreviewHmacSecret();
  const expected = hmacSign(payloadB64, secret);

  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    throw new PreviewTokenError('Invalid preview token signature', 'PREVIEW_TOKEN_INVALID');
  }

  let claims: PreviewTokenClaims;
  try {
    claims = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as PreviewTokenClaims;
  } catch {
    throw new PreviewTokenError('Invalid preview token payload', 'PREVIEW_TOKEN_INVALID');
  }

  if (
    !claims?.revisionId ||
    !claims?.projectId ||
    !claims?.tenantId ||
    typeof claims.exp !== 'number'
  ) {
    throw new PreviewTokenError('Incomplete preview token claims', 'PREVIEW_TOKEN_INVALID');
  }

  const now = opts?.nowMs ?? Date.now();
  if (now >= claims.exp) {
    throw new PreviewTokenError('Preview token expired', 'PREVIEW_TOKEN_EXPIRED');
  }

  return claims;
}

/** Parse `Authorization: Preview <token>` header value. */
export function extractPreviewTokenFromAuthHeader(
  authorization: string | undefined
): string | null {
  if (!authorization) return null;
  const match = /^Preview\s+(\S+)\s*$/i.exec(authorization);
  return match?.[1] ?? null;
}
