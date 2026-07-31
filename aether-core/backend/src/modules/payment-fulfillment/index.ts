import { Router } from 'express';
import { PaymentFulfillmentController } from './api/controllers/PaymentFulfillmentController';

const router = Router();
const controller = new PaymentFulfillmentController();

router.get('/', ...controller.listPayments);
router.get('/summary', ...controller.getSummary);
router.get('/payouts', ...controller.listPayouts);
router.post('/reconcile', ...controller.reconcile);
router.post('/payment', ...controller.processPayment);
router.post('/refund', ...controller.refundPayment);
router.post('/webhook/stripe', controller.stripeWebhook);
router.post('/webhook', ...controller.paymentWebhook);
router.post('/fulfillment', ...controller.createFulfillment);
router.post('/ship', ...controller.shipOrder);
router.get('/connect/onboard', ...controller.connectOnboard);

export default router;
