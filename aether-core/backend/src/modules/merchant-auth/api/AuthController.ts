import { Request, Response } from 'express';
import { z } from 'zod';
import { validateBody } from '../../../shared/security/validate';
import { prisma } from '../../../shared/prisma/client';
import { clearRefreshCookie, setRefreshCookie } from '../../../shared/auth/authCookies';
import { getAccessTokenExpiresInSeconds, signAccessToken } from '../../../shared/auth/jwtService';
import {
  issueRefreshToken,
  REFRESH_COOKIE,
  revokeRefreshToken,
  rotateRefreshToken,
} from '../../../shared/auth/refreshTokenService';
import { loginWithEmail, sessionFromTokenPayload } from '../application/LoginUseCase';
import type { UserRole } from '../../../types/express';

const loginSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
  tenantId: z.string().min(1).max(64).optional(),
});

function buildLoginResponse(result: Awaited<ReturnType<typeof loginWithEmail>>) {
  return {
    accessToken: result.accessToken,
    expiresIn: getAccessTokenExpiresInSeconds(),
    tenantId: result.tenantId,
    merchantName: result.merchantName,
    user: result.user,
  };
}

export class AuthController {
  login = [
    validateBody(loginSchema),
    async (req: Request, res: Response) => {
      const body = req.body as z.infer<typeof loginSchema>;
      const tenantId =
        body.tenantId ??
        (req.header('X-Aether-Tenant-Id') as string | undefined) ??
        process.env.AETHER_DEFAULT_TENANT ??
        'tenant_default';

      try {
        const result = await loginWithEmail(tenantId, body.email, body.password);
        const refresh = await issueRefreshToken(result.user.id);
        setRefreshCookie(res, refresh.token, refresh.expiresAt);
        res.json(buildLoginResponse(result));
      } catch {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    },
  ];

  refresh = [
    async (req: Request, res: Response) => {
      const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (!rawToken) {
        res.status(401).json({ error: 'Missing refresh token' });
        return;
      }

      const rotated = await rotateRefreshToken(rawToken);
      if (!rotated) {
        clearRefreshCookie(res);
        res.status(401).json({ error: 'Invalid or expired refresh token' });
        return;
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: rotated.accessUser.tenantId },
        select: { name: true },
      });

      const accessToken = signAccessToken({
        sub: rotated.accessUser.id,
        tenantId: rotated.accessUser.tenantId,
        role: rotated.accessUser.role,
        email: rotated.accessUser.email,
      });

      setRefreshCookie(res, rotated.refreshToken, rotated.refreshExpiresAt);
      res.json({
        accessToken,
        expiresIn: getAccessTokenExpiresInSeconds(),
        tenantId: rotated.accessUser.tenantId,
        merchantName: tenant?.name ?? 'Merchant',
        user: {
          id: rotated.accessUser.id,
          name: rotated.accessUser.email.split('@')[0] ?? 'Merchant',
          email: rotated.accessUser.email,
          role: rotated.accessUser.role,
        },
      });
    },
  ];

  session = [
    async (req: Request, res: Response) => {
      if (!req.tenantId || !req.userRole || !req.actorId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId },
        select: { name: true },
      });

      const email = req.userEmail ?? `${req.actorId}@aether.local`;

      const payload = sessionFromTokenPayload({
        sub: req.actorId,
        tenantId: req.tenantId,
        role: req.userRole as UserRole,
        email,
        merchantName: tenant?.name ?? 'Merchant',
      });

      res.json({
        tenantId: payload.tenantId,
        merchantName: payload.merchantName,
        user: payload.user,
      });
    },
  ];

  logout = [
    async (req: Request, res: Response) => {
      const rawToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
      if (rawToken) {
        await revokeRefreshToken(rawToken);
      }
      clearRefreshCookie(res);
      res.status(204).send();
    },
  ];
}
