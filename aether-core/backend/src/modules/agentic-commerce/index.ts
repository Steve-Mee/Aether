import { Router } from 'express';
import { AgenticController } from './api/controllers/AgenticController';

const router = Router();
const controller = new AgenticController();

// Start a new negotiation (Customer Agent makes first offer)
router.post('/negotiation/start', controller.startNegotiation.bind(controller));

// Respond to an offer (Merchant Agent or Customer Agent)
router.post('/negotiation/:id/respond', controller.respondToOffer.bind(controller));

// Get negotiation status
router.get('/negotiation/:id', controller.getNegotiation.bind(controller));

// Get all active negotiations
router.get('/negotiations', controller.getActiveNegotiations.bind(controller));

export default router;