import { Router } from 'express';
import { InventoryController } from './api/controllers/InventoryController';

const router = Router();
const controller = new InventoryController();

router.post('/stock', controller.updateStock.bind(controller));
router.post('/price', controller.applyDynamicPrice.bind(controller));
router.get('/low-stock', controller.getLowStock.bind(controller));

export default router;
