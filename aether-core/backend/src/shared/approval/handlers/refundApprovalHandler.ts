import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { writeAuditLog } from '../../audit/auditService';
import { prisma } from '../../prisma/client';
import type { ApprovalActionHandler, ApprovalExecutionContext } from '../types';

export class RefundApprovalHandler implements ApprovalActionHandler {
  canHandle(module: string, actionType: string): boolean {
    return module === 'payment-fulfillment' && actionType === 'refund';
  }

  async execute(ctx: ApprovalExecutionContext): Promise<void> {
    const paymentId = String(ctx.payload.paymentId ?? '');
    const refundId = ctx.payload.refundId ? String(ctx.payload.refundId) : '';
    if (!paymentId && !refundId) {
      throw new Error('refund approval missing paymentId or refundId');
    }

    const dedupeToken = `"approvalId":"${ctx.approvalId}"`;
    const alreadyExecuted = await prisma.auditLog.findFirst({
      where: {
        tenantId: ctx.tenantId,
        action: 'action_executed',
        details: { contains: dedupeToken },
      },
    });
    if (alreadyExecuted) return;

    const amount = ctx.payload.amount as number | undefined;
    const { paymentService, orderRepository } = getCompositionRoot();

    if (paymentId) {
      await paymentService.executeApprovedRefund(paymentId, {
        tenantId: ctx.tenantId,
        amount,
      });
    }

    if (refundId) {
      await orderRepository.updateRefundStatus(refundId, ctx.tenantId, 'completed');
    }

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'payment-fulfillment',
      action: 'action_executed',
      actor: ctx.resolvedBy,
      details: {
        approvalId: ctx.approvalId,
        paymentId: paymentId || undefined,
        refundId: refundId || undefined,
        orderId: ctx.payload.orderId,
        amount,
        dedupeToken,
      },
    });
  }
}
