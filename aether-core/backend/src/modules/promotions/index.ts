import { Router } from 'express';
import { PromotionsController } from './api/controllers/PromotionsController';

const router = Router();

router.get('/', ...PromotionsController.list);
router.post('/', ...PromotionsController.create);

export default router;
