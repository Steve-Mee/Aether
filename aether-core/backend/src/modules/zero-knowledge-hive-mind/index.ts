import { Router } from 'express';
import { HiveMindController } from './api/controllers/HiveMindController';

const router = Router();
const controller = new HiveMindController();

router.post('/insights', ...controller.submitInsight);
router.get('/insights/aggregated', ...controller.getAggregatedInsights);

export default router;
