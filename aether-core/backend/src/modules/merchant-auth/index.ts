import { Router } from 'express';
import { AuthController } from './api/AuthController';
import { authMiddleware } from '../../shared/security/auth';
import { isOidcEnabled } from '../../shared/auth/oidcService';
import { LoginUseCase } from './application/LoginUseCase';
import { PrismaAuthRepository } from './infrastructure/persistence/PrismaAuthRepository';

const router = Router();
const loginUseCase = new LoginUseCase(new PrismaAuthRepository());
const controller = new AuthController(loginUseCase);

router.post('/login', ...controller.login);
router.post('/refresh', ...controller.refresh);
router.get('/session', authMiddleware, ...controller.session);
router.post('/logout', ...controller.logout);

router.get('/oidc/metadata', (_req, res) => {
  res.json({
    enabled: isOidcEnabled(),
    issuer: isOidcEnabled() ? process.env.SSO_OIDC_ISSUER ?? null : null,
  });
});

// Always register OIDC paths (OpenAPI drift + discoverability). Controllers
// guard on SSO_OIDC_ENABLED; session prune timer is lazy + unref'd.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { OidcController } = require('./api/OidcController') as typeof import('./api/OidcController');
const oidcController = new OidcController();
router.get('/oidc/login', ...oidcController.login);
router.get('/oidc/callback', ...oidcController.callback);

export default router;
