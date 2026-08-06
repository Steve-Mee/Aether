import { Request, Response } from 'express';
import {
  createOidcAuthRequest,
  exchangeOidcCode,
  isOidcEnabled,
} from '../../../shared/auth/oidcService';
import { prisma } from '../../../shared/prisma/client';
import { signAccessToken, getAccessTokenExpiresInSeconds } from '../../../shared/auth/jwtService';
import { issueRefreshToken } from '../../../shared/auth/refreshTokenService';
import { setRefreshCookie } from '../../../shared/auth/authCookies';
import { writeAuditLog } from '../../../shared/audit/auditService';
import type { UserRole } from '../../../types/express';
import {
  consumeOidcSession,
  storeOidcSession,
} from '../infrastructure/OidcSessionStore';

function buildCallbackUrl(req: Request): URL {
  const proto = (req.get('x-forwarded-proto') ?? req.protocol ?? 'http').split(',')[0].trim();
  const host = req.get('x-forwarded-host') ?? req.get('host') ?? 'localhost:9000';
  return new URL(`${proto}://${host}${req.originalUrl}`);
}

export class OidcController {
  /**
   * Initiate OIDC authentication flow
   * GET /api/auth/oidc/login
   */
  login = [
    async (req: Request, res: Response) => {
      if (!isOidcEnabled()) {
        res.status(501).json({ error: 'OIDC SSO not enabled' });
        return;
      }

      const tenantId =
        (req.query.tenantId as string | undefined) ??
        (req.header('X-Aether-Tenant-Id') as string | undefined) ??
        process.env.AETHER_DEFAULT_TENANT ??
        'tenant_default';

      try {
        const auth = await createOidcAuthRequest();

        await storeOidcSession(auth.state, {
          state: auth.state,
          nonce: auth.nonce,
          codeVerifier: auth.codeVerifier,
          tenantId,
          createdAt: Date.now(),
        });

        res.redirect(auth.authorizationUrl);
      } catch (error) {
        console.error('OIDC login initiation failed:', error);
        res.status(500).json({ error: 'OIDC configuration error' });
      }
    },
  ];

  /**
   * Handle OIDC callback
   * GET /api/auth/oidc/callback?code=...&state=...
   */
  callback = [
    async (req: Request, res: Response) => {
      if (!isOidcEnabled()) {
        res.status(501).json({ error: 'OIDC SSO not enabled' });
        return;
      }

      const code = req.query.code as string | undefined;
      const state = req.query.state as string | undefined;

      if (!code || !state) {
        res.status(400).json({ error: 'Missing code or state' });
        return;
      }

      const session = await consumeOidcSession(state);
      if (!session) {
        res.status(400).json({ error: 'Invalid or expired state' });
        return;
      }

      try {
        const { userInfo } = await exchangeOidcCode(buildCallbackUrl(req), {
          state: session.state,
          nonce: session.nonce,
          codeVerifier: session.codeVerifier,
        });

        let user = await prisma.user.findUnique({
          where: {
            tenantId_email: {
              tenantId: session.tenantId,
              email: userInfo.email,
            },
          },
        });

        if (!user) {
          user = await prisma.user.create({
            data: {
              tenantId: session.tenantId,
              email: userInfo.email,
              role: 'operator',
              passwordHash: null,
            },
          });

          await writeAuditLog({
            tenantId: session.tenantId,
            module: 'auth',
            action: 'sso.user.provisioned',
            actor: userInfo.email,
            details: { email: userInfo.email, role: 'operator', provider: 'oidc' },
          });
        }

        await writeAuditLog({
          tenantId: session.tenantId,
          module: 'auth',
          action: 'sso.login',
          actor: user.id,
          details: { email: user.email, provider: 'oidc' },
        });

        const accessToken = signAccessToken({
          sub: user.id,
          tenantId: user.tenantId,
          role: user.role as UserRole,
          email: user.email,
        });

        const refresh = await issueRefreshToken(user.id);
        setRefreshCookie(res, refresh.token, refresh.expiresAt);

        const frontendUrl =
          process.env.VITE_API_URL?.replace(':9000', ':5173') ?? 'http://localhost:5173';
        const redirectUrl = `${frontendUrl}/auth/callback?success=true`;

        // Non-httpOnly bridge cookie: SPA reads it once in OidcCallbackPage and moves to localStorage.
        // Refresh token remains httpOnly via setRefreshCookie. See docs/sso-oidc-setup.md.
        res.cookie('aether_access_token', accessToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: getAccessTokenExpiresInSeconds() * 1000,
          path: '/',
        });

        res.redirect(redirectUrl);
      } catch (error) {
        console.error('OIDC callback failed:', error);
        const frontendUrl =
          process.env.VITE_API_URL?.replace(':9000', ':5173') ?? 'http://localhost:5173';
        res.redirect(`${frontendUrl}/auth/callback?error=oidc_failed`);
      }
    },
  ];

  /**
   * Get OIDC metadata
   * GET /api/auth/oidc/metadata
   */
  metadata = [
    async (_req: Request, res: Response) => {
      res.json({
        enabled: isOidcEnabled(),
        issuer: isOidcEnabled() ? process.env.SSO_OIDC_ISSUER : null,
      });
    },
  ];
}
