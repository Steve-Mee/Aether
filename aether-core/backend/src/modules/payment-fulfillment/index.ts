import { Router } from 'express';
import { PaymentFulfillmentController } from './api/controllers/PaymentFulfillmentController';

const router = Router();
const controller = new PaymentFulfillmentController();

// Payment routes
router.post('/payment', controller.processPayment.bind(controller));

// Fulfillment routes
router.post('/fulfillment', controller.createFulfillment.bind(controller));
router.post('/ship', controller.shipOrder.bind(controller));

export default router;