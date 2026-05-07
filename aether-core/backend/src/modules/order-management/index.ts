import { Router } from 'express';
import { OrderController } from './api/controllers/OrderController';

const router = Router();
const controller = new OrderController();

// ============================================
// ORDER MANAGEMENT ROUTES
// ============================================

// Create new order
router.post('/', controller.createOrder.bind(controller));

// Get all orders
router.get('/', controller.getAllOrders.bind(controller));

// Get single order
router.get('/:id', controller.getOrder.bind(controller));

// Update order status
router.patch('/:id/status', controller.updateStatus.bind(controller));

export default router;