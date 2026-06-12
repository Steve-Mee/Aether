import crypto from 'crypto';
import { prisma } from '../prisma/client';
import type { UserRole } from '../../types/express';

const REFRESH_COOKIE = 'aether_refresh';
const DEFAULT_REFRESH_EXPIRES_IN = '7d';

export { REFRESH_COOKIE };

function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return amount * (multipliers[unit] ?? multipliers.d);
}

function refreshExpiresAt(): Date {
  const raw = process.env.AETHER_REFRESH_EXPIRES_IN ?? DEFAULT_REFRESH_EXPIRES_IN;
  return new Date(Date.now() + parseDurationMs(raw));
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

export async function issueRefreshToken(userId: string): Promise<IssuedRefreshToken> {
  const token = generateOpaqueToken();
  const expiresAt = refreshExpiresAt();
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  return { token, expiresAt };
}

export interface RefreshRotationResult {
  accessUser: {
    id: string;
    tenantId: string;
    role: UserRole;
    email: string;
  };
  refreshToken: string;
  refreshExpiresAt: Date;
}

export async function rotateRefreshToken(rawToken: string): Promise<RefreshRotationResult | null> {
  const tokenHash = hashToken(rawToken);
  const existing = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!existing || existing.revokedAt) {
    if (existing?.revokedAt) {
      await revokeAllRefreshTokensForUser(existing.userId);
    }
    return null;
  }

  if (existing.expiresAt.getTime() < Date.now()) {
    await prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });
    return null;
  }

  const role = existing.user.role as UserRole;
  if (!['admin', 'operator', 'viewer'].includes(role)) {
    return null;
  }

  const next = await issueRefreshToken(existing.userId);
  await prisma.refreshToken.update({
    where: { id: existing.id },
    data: { revokedAt: new Date() },
  });

  return {
    accessUser: {
      id: existing.user.id,
      tenantId: existing.user.tenantId,
      role,
      email: existing.user.email,
    },
    refreshToken: next.token,
    refreshExpiresAt: next.expiresAt,
  };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}
