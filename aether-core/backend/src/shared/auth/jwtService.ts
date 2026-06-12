import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '../../types/express';

export interface AccessTokenPayload {
  sub: string;
  tenantId: string;
  role: UserRole;
  email: string;
}

const DEFAULT_EXPIRES_IN = '15m';

function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 15 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? multipliers.m);
}

export function getAccessTokenExpiresInSeconds(): number {
  const raw = process.env.AETHER_JWT_EXPIRES_IN ?? DEFAULT_EXPIRES_IN;
  return Math.floor(parseDurationMs(raw) / 1000);
}

function jwtSecret(): string {
  const secret = process.env.AETHER_JWT_SECRET;
  if (!secret || secret.trim().length < 16) {
    throw new Error('AETHER_JWT_SECRET must be set (min 16 chars) for JWT auth');
  }
  return secret;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  const options: SignOptions = {
    expiresIn: (process.env.AETHER_JWT_EXPIRES_IN ?? DEFAULT_EXPIRES_IN) as SignOptions['expiresIn'],
    issuer: 'aether-core',
    audience: 'aether-merchant',
  };
  return jwt.sign(payload, jwtSecret(), options);
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    const decoded = jwt.verify(token, jwtSecret(), {
      issuer: 'aether-core',
      audience: 'aether-merchant',
    });
    if (typeof decoded !== 'object' || decoded === null) return null;
    const o = decoded as Record<string, unknown>;
    const role = o.role as UserRole;
    if (
      typeof o.sub !== 'string' ||
      typeof o.tenantId !== 'string' ||
      typeof o.email !== 'string' ||
      !['admin', 'operator', 'viewer'].includes(role)
    ) {
      return null;
    }
    return {
      sub: o.sub,
      tenantId: o.tenantId,
      role,
      email: o.email,
    };
  } catch {
    return null;
  }
}
