import { Router } from 'express';
import { HiveMindController } from './api/controllers/HiveMindController';

const router = Router();
const controller = new HiveMindController();

// Submit anonymous insight
router.post('/insights', controller.submitInsight.bind(controller));

// Get aggregated insights (privacy-preserving)
router.get('/insights/aggregated', controller.getAggregatedInsights.bind(controller));

export default router;