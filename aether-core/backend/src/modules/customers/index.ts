import { Router } from 'express';
import { CustomerController } from './api/controllers/CustomerController';

const router = Router();

router.get('/', ...CustomerController.list);
router.get('/:id', ...CustomerController.getById);
router.get('/:id/orders', ...CustomerController.listOrders);

export default router;
