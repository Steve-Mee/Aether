import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { verifyWebhookSecret } from '../../../../shared/security/auth';
import { resolvePaymentWebhookTenant, resolveStripeWebhookTenant } from '../../../../shared/security/webhookTenantResolver';
import { verifyStripeWebhook, createStripeConnectOnboardingLink } from '../../infrastructure/providers/PaymentProvider';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator } from '../../../../shared/security/rbac';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { validateBody } from '../../../../shared/security/validate';

const paymentSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: z.string().min(1),
  idempotencyKey: z.string().optional(),
});

const fulfillmentSchema = z.object({
  orderId: z.string().min(1),
});

const shipSchema = z.object({
  fulfillmentId: z.string().min(1),
  carrier: z.string().min(1),
  trackingNumber: z.string().min(1),
});

const refundSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.number().positive().optional(),
});

const webhookSchema = z.object({
  provider: z.enum(['stripe', 'adyen', 'local']),
  status: z.string().optional(),
  transactionId: z.string().optional(),
  payment_intent: z.string().optional(),
});

export class PaymentFulfillmentController {
  processPayment = [
    requireOperator,
    validateBody(paymentSchema),
    async (req: Request, res: Response) => {
      try {
        const { orderId, amount, paymentMethod, idempotencyKey } = req.body;
        const { processPayment } = getCompositionRoot();
        const payment = await processPayment.execute(orderId, amount, paymentMethod, {
          tenantId: req.tenantId!,
          idempotencyKey,
          actorId: req.actorId,
        });
        await writeAuditLog({
          tenantId: req.tenantId!,
          module: 'payment-fulfillment',
          action: 'payment_processed',
          actor: req.actorId,
          details: { orderId, amount, status: payment.status, provider: process.env.PAYMENT_PROVIDER ?? 'local' },
        });
        res.json({ status: 'partial', success: payment.status === 'paid', payment });
      } catch {
        res.status(500).json({ error: 'Payment processing failed' });
      }
    },
  ];

  refundPayment = [
    requireOperator,
    validateBody(refundSchema),
    async (req: Request, res: Response) => {
      try {
        const { paymentId, amount } = req.body;
        const { paymentService } = getCompositionRoot();
        await paymentService.refund(paymentId, {
          tenantId: req.tenantId!,
          amount,
          actorId: req.actorId,
        });
        res.json({ success: true, message: 'Refund initiated or approval created' });
      } catch {
        res.status(400).json({ error: 'Refund failed' });
      }
    },
  ];

  stripeWebhook = async (req: Request, res: Response) => {
    const signature = req.header('stripe-signature');
    const rawBody = JSON.stringify(req.body);
    const verified = await verifyStripeWebhook(rawBody, signature);
    if (!verified.valid) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }
    const event = verified.event;
    if (event?.type === 'payment_intent.succeeded') {
      const intent = event.data.object as { id: string; metadata?: { tenantId?: string } };
      const transactionId = intent.id;
      const tenantId = resolveStripeWebhookTenant(intent.metadata?.tenantId);
      const headerTenant = req.header('X-Aether-Tenant-Id');
      if (headerTenant && headerTenant !== tenantId) {
        res.status(403).json({ error: 'Webhook tenant header must match resolved tenant' });
        return;
      }
      req.tenantId = tenantId;
      const { paymentService } = getCompositionRoot();
      await paymentService.handleWebhook('stripe', { status: 'paid', transactionId }, tenantId);
    }
    res.json({ acknowledged: true });
  };

  requirePaymentWebhookSecret(req: Request, res: Response, next: NextFunction): void {
    if (!verifyWebhookSecret(req.header('X-Webhook-Secret'), 'PAYMENT_WEBHOOK_SECRET')) {
      res.status(403).json({ error: 'Invalid or missing payment webhook secret' });
      return;
    }
    next();
  }

  paymentWebhook = [
    this.requirePaymentWebhookSecret.bind(this),
    resolvePaymentWebhookTenant,
    validateBody(webhookSchema),
    async (req: Request, res: Response) => {
      const { provider, ...payload } = req.body;
      const { paymentService } = getCompositionRoot();
      const result = await paymentService.handleWebhook(provider, payload, req.tenantId!);
      res.json(result);
    },
  ];

  createFulfillment = [
    requireOperator,
    validateBody(fulfillmentSchema),
    async (req: Request, res: Response) => {
      try {
        const { orderId } = req.body;
        const { fulfillmentService, persistFulfillment } = getCompositionRoot();
        const fulfillment = await fulfillmentService.createFulfillment(orderId);
        await persistFulfillment.persistFulfillment(req.tenantId!, orderId, fulfillment.status);
        res.json({ status: 'partial', success: true, fulfillment });
      } catch {
        res.status(500).json({ error: 'Fulfillment creation failed' });
      }
    },
  ];

  shipOrder = [
    requireOperator,
    validateBody(shipSchema),
    async (req: Request, res: Response) => {
      try {
        const { fulfillmentId, carrier, trackingNumber } = req.body;
        const { fulfillmentService } = getCompositionRoot();
        const shipment = await fulfillmentService.ship(fulfillmentId, carrier, trackingNumber);
        res.json({ status: 'partial', success: true, shipment });
      } catch {
        res.status(500).json({ error: 'Shipping failed' });
      }
    },
  ];

  connectOnboard = [
    requireOperator,
    async (req: Request, res: Response) => {
      const result = await createStripeConnectOnboardingLink(req.tenantId!);
      res.json(result);
    },
  ];
}
