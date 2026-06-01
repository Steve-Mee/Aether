import { Payment } from '../../domain/entities/Payment';
import { PaymentRepository } from '../../domain/repositories/PaymentRepository';
import type { PaymentEntityMapper, PaymentGatewayPort } from '../../application/ports/PaymentGatewayPort';
import type { PaymentIdempotencyPort } from '../../application/ports/PaymentIdempotencyPort';
import type { PaymentWebhookPort } from '../../application/ports/PaymentWebhookPort';
import { createApproval } from '../../../../shared/approval/approvalService';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import { policyEngine } from '../../../../ai/orchestrator/WorkflowEngine';

export class PaymentService {
  constructor(
    private paymentRepository: PaymentRepository,
    private gateway: PaymentGatewayPort,
    private mapper: PaymentEntityMapper,
    private idempotency: PaymentIdempotencyPort,
    private webhookPort: PaymentWebhookPort
  ) {}

  async processPayment(
    orderId: string,
    amount: number,
    paymentMethod: string,
    ctx?: { tenantId: string; idempotencyKey?: string; actorId?: string }
  ): Promise<Payment> {
    const tenantId = requireTenantId(ctx?.tenantId, 'PaymentService.processPayment');

    if (ctx?.idempotencyKey) {
      const existingPaymentId = await this.idempotency.findPaymentId(tenantId, ctx.idempotencyKey);
      if (existingPaymentId) {
        const payment = await this.paymentRepository.findById(existingPaymentId, tenantId);
        if (payment) return payment;
      }
    }

    const result = await this.gateway.processPayment(orderId, amount, paymentMethod);
    const payment = this.mapper.toPaymentEntity(orderId, amount, paymentMethod, result);
    const saved = await this.paymentRepository.create(payment, tenantId);

    if (ctx?.idempotencyKey) {
      await this.idempotency.save(tenantId, ctx.idempotencyKey, saved.id);
    }

    return saved;
  }

  async refund(
    paymentId: string,
    ctx?: { tenantId: string; amount?: number; actorId?: string }
  ): Promise<void> {
    const tenantId = requireTenantId(ctx?.tenantId, 'PaymentService.refund');
    const payment = await this.paymentRepository.findById(paymentId, tenantId);
    if (!payment) throw new Error('Payment not found');

    const refundAmount = ctx?.amount ?? payment.amount;
    const policy = policyEngine.evaluate('payment.refund', { amount: refundAmount });

    if (policy.requiresApproval) {
      await createApproval({
        tenantId,
        module: 'payment-fulfillment',
        actionType: 'refund',
        payload: { paymentId, amount: refundAmount },
        requestedBy: ctx?.actorId,
      });
      return;
    }

    if (payment.transactionId) {
      await this.gateway.refund(payment.transactionId, refundAmount);
    }
    await this.paymentRepository.updateStatus(paymentId, 'refunded', tenantId);
  }

  /** Executes refund after human approval (skips approval gate). */
  async executeApprovedRefund(
    paymentId: string,
    ctx: { tenantId: string; amount?: number }
  ): Promise<void> {
    const tenantId = requireTenantId(ctx.tenantId, 'PaymentService.executeApprovedRefund');
    const payment = await this.paymentRepository.findById(paymentId, tenantId);
    if (!payment) throw new Error('Payment not found');

    const refundAmount = ctx.amount ?? payment.amount;
    if (payment.transactionId) {
      await this.gateway.refund(payment.transactionId, refundAmount);
    }
    await this.paymentRepository.updateStatus(paymentId, 'refunded', tenantId);
  }

  async handleWebhook(
    _provider: string,
    payload: Record<string, unknown>,
    tenantId: string
  ): Promise<{ acknowledged: boolean }> {
    const status = payload.status as string | undefined;
    const transactionId = (payload.transactionId ?? payload.payment_intent) as string | undefined;

    if (transactionId && status === 'paid') {
      await this.webhookPort.markPaidByTransaction(tenantId, transactionId);
    }
    return { acknowledged: true };
  }
}
