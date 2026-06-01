import { getCompositionRoot } from '../../../bootstrap/compositionRoot';
import { writeAuditLog } from '../../audit/auditService';
import { eventBus } from '../../events/eventBus';
import { prisma } from '../../prisma/client';
import type { ApprovalActionHandler, ApprovalExecutionContext } from '../types';

const SUPPLIER_MODULES = new Set(['supplier-intelligence']);
const SUPPLIER_ACTIONS = new Set(['price_change', 'new_product', 'stock_change']);

export class SupplierApprovalHandler implements ApprovalActionHandler {
  canHandle(module: string, actionType: string): boolean {
    return SUPPLIER_MODULES.has(module) && SUPPLIER_ACTIONS.has(actionType);
  }

  async execute(ctx: ApprovalExecutionContext): Promise<void> {
    const supplierId = String(ctx.payload.supplierId ?? '');
    if (!supplierId) throw new Error('supplier approval missing supplierId');

    const dedupeToken = `"approvalId":"${ctx.approvalId}"`;
    const alreadyExecuted = await prisma.auditLog.findFirst({
      where: {
        tenantId: ctx.tenantId,
        action: 'action_executed',
        details: { contains: dedupeToken },
      },
    });
    if (alreadyExecuted) return;

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'supplier-intelligence',
      action: 'autonomy_execute',
      actor: ctx.resolvedBy,
      details: { approvalId: ctx.approvalId, supplierId },
    });

    const { supplierChangePort } = getCompositionRoot();
    const appliedCount = await supplierChangePort.applyPendingChanges(
      ctx.tenantId,
      supplierId,
      ctx.payload
    );

    await eventBus.publish({
      tenantId: ctx.tenantId,
      type: 'supplier.price_changed',
      payload: {
        supplierId,
        change: ctx.payload,
        appliedViaApproval: true,
        approvalId: ctx.approvalId,
        skipRescrape: true,
        appliedCount,
      },
      idempotencyKey: `supplier.applied:${ctx.approvalId}`,
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'supplier-intelligence',
      action: 'action_executed',
      actor: ctx.resolvedBy,
      details: {
        approvalId: ctx.approvalId,
        supplierId,
        actionType: ctx.actionType,
        appliedCount,
        dedupeToken,
      },
    });
  }
}
