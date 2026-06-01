import { prisma } from '../../prisma/client';
import { writeAuditLog } from '../../audit/auditService';
import { emailPolicyService } from '../../../modules/aether-mail/application/services/EmailPolicyService';
import { smtpMailSender } from '../../../modules/aether-mail/infrastructure/smtp/SmtpMailSenderAdapter';
import type { ApprovalActionHandler, ApprovalExecutionContext } from '../types';

export class EmailApprovalHandler implements ApprovalActionHandler {
  canHandle(module: string, actionType: string): boolean {
    return module === 'aether-mail' && actionType === 'email_response';
  }

  async execute(ctx: ApprovalExecutionContext): Promise<void> {
    const emailId = String(ctx.payload.emailId ?? '');
    if (!emailId) throw new Error('email_response approval missing emailId');

    const dedupeToken = `"approvalId":"${ctx.approvalId}"`;
    const alreadyExecuted = await prisma.auditLog.findFirst({
      where: {
        tenantId: ctx.tenantId,
        action: 'action_executed',
        details: { contains: dedupeToken },
      },
    });
    if (alreadyExecuted) return;

    const row = await prisma.emailMessage.findFirst({
      where: { id: emailId, tenantId: ctx.tenantId },
    });
    if (!row) throw new Error(`Email not found: ${emailId}`);

    const category = String(ctx.payload.category ?? row.category ?? 'simple_question');
    const draftReply = emailPolicyService.buildAutoReply(category);
    const sendResult = await smtpMailSender.send({
      to: row.from,
      subject: `Re: ${row.subject ?? 'Your inquiry'}`,
      body: draftReply,
    });

    await prisma.emailMessage.update({
      where: { id: emailId },
      data: {
        status: sendResult.sent ? 'replied' : 'draft_ready',
        draftReply,
        sentAt: sendResult.sent ? new Date() : undefined,
      },
    });

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'aether-mail',
      action: 'action_executed',
      actor: ctx.resolvedBy,
      details: {
        approvalId: ctx.approvalId,
        emailId,
        actionType: 'email_response',
        sent: sendResult.sent,
        dedupeToken,
      },
    });
  }
}
