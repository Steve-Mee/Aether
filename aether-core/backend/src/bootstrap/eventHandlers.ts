import { eventBus, DomainEventPayload } from '../shared/events/eventBus';
import { markHandlerRegistered } from '../shared/events/eventHandlerRegistry';
import { logger } from '../shared/logging/logger';
import { writeAuditLog } from '../shared/audit/auditService';
import { prisma } from '../shared/prisma/client';
import { recordBillableOutcome } from '../shared/billing/billingService';
import {
  recordOperationalOutcome,
  isBlockedOutcomeSource,
} from '../shared/outcomes/OutcomeVerificationService';
import { orchestrator } from '../ai/orchestrator/Orchestrator';
import { merchantNotificationService } from '../shared/notifications/merchantNotificationService';
import { DefaultContributionGate } from '../ai/intelligence/knowledge-transfer/contribution/DefaultContributionGate';

const contributionGate = new DefaultContributionGate();

async function auditEventAlreadyHandled(
  tenantId: string,
  action: string,
  dedupeToken: string
): Promise<boolean> {
  const existing = await prisma.auditLog.findFirst({
    where: {
      tenantId,
      action,
      details: { contains: dedupeToken },
    },
  });
  return !!existing;
}

/**
 * Central registration of all domain event subscribers.
 * Required handlers are validated at bootstrap via assertAllRequiredHandlersRegistered().
 */
export function registerEventHandlers(): void {
  eventBus.subscribe('command.executed', async (event: DomainEventPayload) => {
    const source = String(event.payload.source ?? 'command.executed');
    if (isBlockedOutcomeSource(source)) {
      logger.info('outcome_firewall_blocked', { source, tenantId: event.tenantId });
      return;
    }

    const revenue = event.payload.revenueDelta as number | undefined;
    if (!revenue || revenue <= 0) return;

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - 30 * 86400000);
    const result = await recordOperationalOutcome({
      tenantId: event.tenantId,
      metric: 'revenue',
      observed: revenue,
      confidence: 0.7,
      periodStart,
      periodEnd,
      source,
    });

    if ('blocked' in result) {
      logger.info('outcome_firewall_blocked', { reason: result.reason, tenantId: event.tenantId });
    }
  });
  markHandlerRegistered('command.executed');

  eventBus.subscribe('outcome.verified', async (event: DomainEventPayload) => {
    if (event.payload.status !== 'billable') return;
    const recordId = event.payload.recordId as string;
    logger.info('billing_hook_billable', { tenantId: event.tenantId, recordId });

    const record = await prisma.outcomeRecord.findFirst({
      where: { id: recordId, tenantId: event.tenantId, verificationStatus: 'billable' },
    });
    if (!record) return;

    const upliftAmount = record.observed - record.baseline;
    await recordBillableOutcome(event.tenantId, recordId, upliftAmount);
  });
  markHandlerRegistered('outcome.verified');

  eventBus.subscribe('mail.approval_required', async (event: DomainEventPayload) => {
    const approvalId = String(event.payload.approvalId ?? '');
    const dedupeToken = `"approvalId":"${approvalId}"`;
    if (approvalId && (await auditEventAlreadyHandled(event.tenantId, 'mail_approval_required_received', dedupeToken))) {
      return;
    }
    await writeAuditLog({
      tenantId: event.tenantId,
      module: 'event-handlers',
      action: 'mail_approval_required_received',
      details: { approvalId: event.payload.approvalId, module: event.payload.module },
    });
    await writeAuditLog({
      tenantId: event.tenantId,
      module: 'event-handlers',
      action: 'approval_backlog_increment',
      details: { approvalId, delta: 1, dedupeToken },
    });
    await merchantNotificationService.notifyApprovalRequired({
      tenantId: event.tenantId,
      approvalId,
      module: String(event.payload.module ?? 'unknown'),
    });
  });
  markHandlerRegistered('mail.approval_required');

  eventBus.subscribe('supplier.price_changed', async (event: DomainEventPayload) => {
    const supplierId = String(event.payload.supplierId ?? '');
    const changeKey = JSON.stringify(event.payload.change ?? {});
    const dedupeToken = `"supplierId":"${supplierId}"`;
    if (supplierId && (await auditEventAlreadyHandled(event.tenantId, 'supplier_price_changed_received', dedupeToken))) {
      const recent = await prisma.auditLog.findFirst({
        where: {
          tenantId: event.tenantId,
          action: 'supplier_price_changed_received',
          details: { contains: changeKey.slice(0, 40) },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (recent) return;
    }
    await writeAuditLog({
      tenantId: event.tenantId,
      module: 'event-handlers',
      action: 'supplier_price_changed_received',
      details: {
        supplierId: event.payload.supplierId,
        changePercent: event.payload.changePercent,
        change: event.payload.change,
      },
    });
    if (supplierId && !event.payload.skipRescrape && !event.payload.appliedViaApproval) {
      await orchestrator.execute({
        tenantId: event.tenantId,
        task: 'supplier.sync',
        input: { supplierId, trigger: 'price_changed_event', change: event.payload.change },
      });
    }

    if (
      event.payload.autoApplied === true &&
      (await contributionGate.canContribute(event.tenantId))
    ) {
      const change = event.payload.change as { type?: string } | undefined;
      const category = change?.type === 'new_product' ? 'inventory' : 'pricing';
      await orchestrator.execute({
        tenantId: event.tenantId,
        task: 'insight.submit',
        input: {
          insights: [
            {
              category,
              metric: 'auto_apply_rate',
              value: 1,
              sampleSize: 1,
            },
          ],
        },
      });
    }
  });
  markHandlerRegistered('supplier.price_changed');

  eventBus.subscribe('mail.processed', async (event: DomainEventPayload) => {
    logger.info('mail_processed_event', {
      tenantId: event.tenantId,
      emailId: event.payload.emailId,
      status: event.payload.status,
    });

    if (
      event.payload.autoSent === true &&
      (await contributionGate.canContribute(event.tenantId))
    ) {
      await orchestrator.execute({
        tenantId: event.tenantId,
        task: 'insight.submit',
        input: {
          insights: [
            {
              category: 'conversion',
              metric: 'mail_auto_reply_rate',
              value: 1,
              sampleSize: 1,
            },
          ],
        },
      });
    }
  });

  eventBus.subscribe('supplier.sync_completed', async (event: DomainEventPayload) => {
    logger.info('supplier_sync_completed', {
      tenantId: event.tenantId,
      supplierId: event.payload.supplierId,
    });
  });

  eventBus.subscribe('decision.executed', async (event: DomainEventPayload) => {
    logger.info('decision_executed', {
      tenantId: event.tenantId,
      decisionId: event.payload.decisionId,
    });
  });

  eventBus.subscribe('negotiation.updated', async (event: DomainEventPayload) => {
    logger.info('negotiation_updated', {
      tenantId: event.tenantId,
      negotiationId: event.payload.negotiationId,
    });
  });

  eventBus.subscribe('outcome.recorded', async (event: DomainEventPayload) => {
    logger.info('outcome_recorded', {
      tenantId: event.tenantId,
      recordId: event.payload.recordId,
      metric: event.payload.metric,
    });
  });
}
