import { Router } from 'express';
import { SelfEvolvingController } from './api/controllers/SelfEvolvingController';

const router = Router();
const controller = new SelfEvolvingController();

router.post('/analyze', ...controller.analyzeCodebase);
router.get('/proposals', ...controller.getAllProposals);
router.post('/proposals/:id/approve', ...controller.approveAndApply);
router.post('/proposals/:id/promote', ...controller.promoteProposal);
router.post('/proposals/:id/rollback', ...controller.rollbackProposal);
router.get('/status', ...controller.getStatus);

export default router;
