import { Router } from 'express';
import { AuthController } from './api/AuthController';
import { authMiddleware } from '../../shared/security/auth';
import { LoginUseCase } from './application/LoginUseCase';
import { PrismaAuthRepository } from './infrastructure/persistence/PrismaAuthRepository';

const router = Router();
const loginUseCase = new LoginUseCase(new PrismaAuthRepository());
const controller = new AuthController(loginUseCase);

router.post('/login', ...controller.login);
router.post('/refresh', ...controller.refresh);
router.get('/session', authMiddleware, ...controller.session);
router.post('/logout', ...controller.logout);

export default router;
