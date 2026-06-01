import { Router } from 'express';
import { InventoryController } from './api/controllers/InventoryController';

const router = Router();
const controller = new InventoryController();

router.post('/stock', ...controller.updateStock);
router.post('/price', ...controller.applyDynamicPrice);
router.get('/low-stock', ...controller.getLowStock);

export default router;
