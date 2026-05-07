import { Router } from 'express';
import { AutonomousController } from './api/controllers/AutonomousController';

const router = Router();
const controller = new AutonomousController();

// ============================================
// AUTONOMOUS OPERATIONS ROUTES
// ============================================

// Get all autonomous decisions
router.get('/', controller.getAllDecisions.bind(controller));

// Trigger a new autonomous decision
router.post('/decision', controller.triggerDecision.bind(controller));

// Get decision by ID
router.get('/decision/:id', controller.getDecisionById.bind(controller));

export default router;