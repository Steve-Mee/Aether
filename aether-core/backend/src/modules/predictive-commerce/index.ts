import { Router } from 'express';
import { PredictiveController } from './api/controllers/PredictiveController';

const router = Router();
const controller = new PredictiveController();

router.post('/forecast', ...controller.runDemandForecast);
router.post('/generate-product', ...controller.generateProductIdeas);
router.get('/trends', ...controller.getTrendSignals);
router.get('/forecast/:productId', ...controller.getProductForecast);

export default router;
