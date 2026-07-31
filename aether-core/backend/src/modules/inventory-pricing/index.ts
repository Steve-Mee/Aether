import { Router } from 'express';
import { InventoryController } from './api/controllers/InventoryController';

const router = Router();
const controller = new InventoryController();

router.get('/', ...controller.listInventory);
router.get('/low-stock', ...controller.getLowStock);
router.post('/stock', ...controller.updateStock);
router.post('/adjust', ...controller.adjustStock);
router.post('/price', ...controller.applyDynamicPrice);

export default router;
