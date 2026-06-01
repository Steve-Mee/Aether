import { Router } from 'express';
import { PaymentFulfillmentController } from './api/controllers/PaymentFulfillmentController';

const router = Router();
const controller = new PaymentFulfillmentController();

router.post('/payment', ...controller.processPayment);
router.post('/refund', ...controller.refundPayment);
router.post('/webhook/stripe', controller.stripeWebhook);
router.post('/webhook', ...controller.paymentWebhook);
router.post('/fulfillment', ...controller.createFulfillment);
router.post('/ship', ...controller.shipOrder);
router.get('/connect/onboard', ...controller.connectOnboard);

export default router;
