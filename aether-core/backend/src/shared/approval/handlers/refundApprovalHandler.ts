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
    if (!paymentId) throw new Error('refund approval missing paymentId');

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
    const { paymentService } = getCompositionRoot();

    await paymentService.executeApprovedRefund(paymentId, {
      tenantId: ctx.tenantId,
      amount,
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'payment-fulfillment',
      action: 'action_executed',
      actor: ctx.resolvedBy,
      details: {
        approvalId: ctx.approvalId,
        paymentId,
        amount,
        dedupeToken,
      },
    });
  }
}
