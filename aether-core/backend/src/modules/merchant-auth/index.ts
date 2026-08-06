import { Router } from 'express';
import { AuthController } from './api/AuthController';
import { OidcController } from './api/OidcController';
import { authMiddleware } from '../../shared/security/auth';
import { LoginUseCase } from './application/LoginUseCase';
import { PrismaAuthRepository } from './infrastructure/persistence/PrismaAuthRepository';

const router = Router();
const loginUseCase = new LoginUseCase(new PrismaAuthRepository());
const controller = new AuthController(loginUseCase);
const oidcController = new OidcController();

router.post('/login', ...controller.login);
router.post('/refresh', ...controller.refresh);
router.get('/session', authMiddleware, ...controller.session);
router.post('/logout', ...controller.logout);

// OIDC SSO routes (enterprise feature)
router.get('/oidc/login', ...oidcController.login);
router.get('/oidc/callback', ...oidcController.callback);
router.get('/oidc/metadata', ...oidcController.metadata);

export default router;
