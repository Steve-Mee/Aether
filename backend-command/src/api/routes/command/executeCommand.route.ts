// src/api/routes/command/executeCommand.route.ts
import { Router } from 'express';
import { z } from 'zod';
import { DecisionEngine } from '../../../ai/decision/decision-engine';
import { AuditLogger } from '../../../infrastructure/logging/audit-logger';
import { EventBus } from '../../../infrastructure/events/event-bus';
import { PricingUseCase } from '../../../modules/pricing/application/use-cases/pricing.use-case';
import { InventoryUseCase } from '../../../modules/inventory/application/use-cases/inventory.use-case';
import { MailUseCase } from '../../../modules/aether-mail/application/use-cases/mail.use-case';
import { SupplierSyncUseCase } from '../../../modules/supplier-intelligence/application/use-cases/supplier-sync.use-case';
import { HumanApprovalService } from '../../../modules/command/application/human-approval.service';

const router = Router();

const ExecuteSchema = z.object({ actionId: z.string().uuid(), proposedAction: z.object({ type: z.enum(['UPDATE_PRICE','UPDATE_INVENTORY','SYNC_SUPPLIER','SEND_MAIL_REPLY','CREATE_PROMOTION','ADJUST_STOCK']), payload: z.record(z.any()) }), approvedByHuman: z.boolean().optional() });

router.post('/command/execute', async (req, res) => {
  const start = Date.now(); const merchantId = req.merchant?.id;
  try {
    const input = ExecuteSchema.parse(req.body);
    const decision = await DecisionEngine.getDecisionById(input.actionId);
    if (!decision) return res.status(404).json({ success: false, message: 'Decision not found' });

    if (decision.riskLevel === 'high' && !input.approvedByHuman) {
      await HumanApprovalService.queueForApproval({ actionId: input.actionId, merchantId, proposedAction: input.proposedAction, originalDecision: decision });
      await AuditLogger.log({ type: 'COMMAND_QUEUED_FOR_HUMAN_APPROVAL', merchantId, actionId: input.actionId });
      return res.json({ success: true, queued: true, message: 'High-risk action queued for human approval' });
    }

    let result: any;
    switch (input.proposedAction.type) {
      case 'UPDATE_PRICE': result = await PricingUseCase.updatePrice(input.proposedAction.payload); break;
      case 'UPDATE_INVENTORY': case 'ADJUST_STOCK': result = await InventoryUseCase.adjustStock(input.proposedAction.payload); break;
      case 'SYNC_SUPPLIER': result = await SupplierSyncUseCase.sync(input.proposedAction.payload); break;
      case 'SEND_MAIL_REPLY': result = await MailUseCase.sendReply(input.proposedAction.payload); break;
      default: throw new Error(`Unsupported: ${input.proposedAction.type}`);
    }

    await AuditLogger.log({ type: 'COMMAND_EXECUTED_AUTONOMOUSLY', merchantId, actionId: input.actionId, actionType: input.proposedAction.type, confidence: decision.confidence, durationMs: Date.now()-start, result });
    await EventBus.publish('command.executed', { merchantId, actionId: input.actionId, type: input.proposedAction.type, result });

    return res.json({ success: true, message: `Executed: ${input.proposedAction.type}`, executedActionId: input.actionId, result });
  } catch (error: any) {
    await AuditLogger.logError({ type: 'COMMAND_EXECUTION_FAILED', merchantId, error: error.message });
    return res.status(500).json({ success: false, message: error.message });
  }
});
export default router;