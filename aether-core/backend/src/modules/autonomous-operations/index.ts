import { Router } from 'express';
import { AutonomousController } from './api/controllers/AutonomousController';

const router = Router();
const controller = new AutonomousController();

router.get('/', ...controller.getAllDecisions);
router.post('/decision', ...controller.triggerDecision);
router.get('/decision/:id', ...controller.getDecisionById);

export default router;
