import { Router } from 'express';
import { PredictiveController } from './api/controllers/PredictiveController';

const router = Router();
const controller = new PredictiveController();

// Demand forecast
router.post('/forecast', controller.runDemandForecast.bind(controller));

// Generate new product ideas
router.post('/generate-product', controller.generateProductIdeas.bind(controller));

// Get trend signals
router.get('/trends', controller.getTrendSignals.bind(controller));

// Get forecast for specific product
router.get('/forecast/:productId', controller.getProductForecast.bind(controller));

export default router;