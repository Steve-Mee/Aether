import { Router } from 'express';
import { AuthController } from './api/AuthController';
import { authMiddleware } from '../../shared/security/auth';

const router = Router();
const controller = new AuthController();

router.post('/login', ...controller.login);
router.post('/refresh', ...controller.refresh);
router.get('/session', authMiddleware, ...controller.session);
router.post('/logout', ...controller.logout);

export default router;
