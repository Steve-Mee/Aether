import { OrderRepository } from '../../domain/repositories/OrderRepository';
import type { PaymentRepository } from '../../../payment-fulfillment/domain/repositories/PaymentRepository';
import { createApproval } from '../../../../shared/approval/approvalService';
import { policyEngine } from '../../../../ai/orchestrator/WorkflowEngine';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class CreateOrderRefundUseCase {
  constructor(
    private orderRepo: OrderRepository,
    private paymentRepo: PaymentRepository
  ) {}

  async execute(
    tenantId: string,
    orderId: string,
    data: { amount: number; reason?: string },
    actorId?: string
  ) {
    const tid = requireTenantId(tenantId, 'CreateOrderRefundUseCase.execute');
    const order = await this.orderRepo.findById(orderId, tid);
    if (!order) return null;

    if (data.amount <= 0 || data.amount > order.total) {
      throw new Error('Invalid refund amount');
    }

    const refund = await this.orderRepo.createRefund(orderId, tid, {
      amount: data.amount,
      reason: data.reason,
      currency: order.currency,
    });
    if (!refund) return null;

    const payments = await this.paymentRepo.findByOrderId(orderId, tid);
    const payment = payments[0];

    const policy = policyEngine.evaluate('payment.refund', { amount: data.amount });
    let approval: { id: string; status: string } | undefined;

    if (policy.requiresApproval) {
      approval = await createApproval({
        tenantId: tid,
        module: 'payment-fulfillment',
        actionType: 'refund',
        payload: {
          paymentId: payment?.id,
          refundId: refund.id,
          orderId,
          amount: data.amount,
          reason: data.reason,
        },
        requestedBy: actorId,
      });
    }

    return { refund, approval: approval ?? null };
  }
}
