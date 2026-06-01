import { Router } from 'express';
import { AgenticController } from './api/controllers/AgenticController';

const router = Router();
const controller = new AgenticController();

router.post('/negotiation/start', ...controller.startNegotiation);
router.post('/negotiation/:id/respond', ...controller.respondToOffer);
router.get('/negotiation/:id', ...controller.getNegotiation);
router.get('/negotiations', ...controller.getActiveNegotiations);
router.get('/negotiations/metrics', ...controller.getNegotiationMetrics);

export default router;
