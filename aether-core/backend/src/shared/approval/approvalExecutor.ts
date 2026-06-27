import { logger } from '../logging/logger';
import { EmailApprovalHandler } from './handlers/emailApprovalHandler';
import { SupplierApprovalHandler } from './handlers/supplierApprovalHandler';
import { RefundApprovalHandler } from './handlers/refundApprovalHandler';
import { SelfEvolvingApprovalHandler } from './handlers/selfEvolvingApprovalHandler';
import { BrainToolApprovalHandler } from './handlers/brainToolApprovalHandler';
import type { ApprovalActionHandler, ApprovalExecutionContext } from './types';

const handlers: ApprovalActionHandler[] = [
  new EmailApprovalHandler(),
  new SupplierApprovalHandler(),
  new RefundApprovalHandler(),
  new SelfEvolvingApprovalHandler(),
];

let brainToolHandler: BrainToolApprovalHandler | null = null;

export function registerBrainToolApprovalHandler(handler: BrainToolApprovalHandler): void {
  brainToolHandler = handler;
  handlers.push(handler);
}

export function registerApprovalHandler(handler: ApprovalActionHandler): void {
  handlers.push(handler);
}

export async function executeApprovedAction(ctx: ApprovalExecutionContext): Promise<void> {
  const handler = handlers.find((h) => h.canHandle(ctx.module, ctx.actionType));
  if (!handler) {
    logger.warn('approval_executor_no_handler', {
      module: ctx.module,
      actionType: ctx.actionType,
      approvalId: ctx.approvalId,
    });
    return;
  }

  await handler.execute(ctx);
}
