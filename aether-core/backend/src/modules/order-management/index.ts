import { Router } from 'express';
import { OrderController } from './api/controllers/OrderController';

const router = Router();
const controller = new OrderController();

router.post('/', ...controller.createOrder);
router.get('/', ...controller.getAllOrders);
router.get('/:id', ...controller.getOrder);
router.patch('/:id/status', ...controller.updateStatus);

export default router;
