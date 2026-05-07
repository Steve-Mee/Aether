import { Router } from 'express';
import { SelfEvolvingController } from './api/controllers/SelfEvolvingController';

const router = Router();
const controller = new SelfEvolvingController();

// Analyze entire codebase and propose improvements
router.post('/analyze', controller.analyzeCodebase.bind(controller));

// Get all proposed improvements
router.get('/proposals', controller.getAllProposals.bind(controller));

// Approve and apply a specific improvement
router.post('/proposals/:id/approve', controller.approveAndApply.bind(controller));

// Get status of self-evolving system
router.get('/status', controller.getStatus.bind(controller));

export default router;