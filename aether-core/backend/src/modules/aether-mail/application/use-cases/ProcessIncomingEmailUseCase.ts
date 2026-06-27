import { EmailMessage } from '../../domain/entities/EmailMessage';
import { EmailRepository } from '../../domain/repositories/EmailRepository';
import { EmailClassifierService } from '../services/EmailClassifierService';
import { EmailContextProvider } from '../services/EmailContextProvider';
import { EmailPolicyService, emailPolicyService } from '../services/EmailPolicyService';
import { MailSenderPort } from '../ports/MailSenderPort';
import { createApproval } from '../../../../shared/approval/approvalService';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import type { OrchestratorPort } from '../../../../ai/orchestrator/OrchestratorPort';
import { defaultOrchestratorPort } from '../../../../ai/orchestrator/OrchestratorAdapter';
import { AutonomyLoop } from '../../../../shared/autonomy/AutonomyLoop';
import { merchantAutonomyKernel } from '../../../../ai/autonomy/DecisionContract';
import type { PersonalBrainRegistry } from '../../../../ai/intelligence/personal-brain/PersonalBrainRegistry';
import type { PeerDelegationBridge } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';
import { isMailPeerEnabled } from '../../../../ai/intelligence/multi-agent/peer/PeerDelegationBridge';

import { policyEngine } from '../../../../ai/orchestrator/WorkflowEngine';

export class ProcessIncomingEmailUseCase {
  constructor(
    private emailRepository: EmailRepository,
    private classifier: EmailClassifierService,
    private mailSender: MailSenderPort,
    private contextProvider: EmailContextProvider,
    private policyService: EmailPolicyService = emailPolicyService,
    private orchestratorPort: OrchestratorPort = defaultOrchestratorPort,
    private personalBrains?: PersonalBrainRegistry,
    private peerBridge?: PeerDelegationBridge
  ) {}

  async execute(
    rawEmail: { from: string; subject?: string; body?: string; messageId?: string },
    ctx: { tenantId: string; actorId?: string }
  ): Promise<EmailMessage & { approvalId?: string; contextSource?: string; autoSent?: boolean }> {
    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'aether-mail',
      action: 'autonomy_observe',
      actor: ctx.actorId,
      details: { from: rawEmail.from, subject: rawEmail.subject },
    });

    const context = await this.contextProvider.getContext(rawEmail.from, ctx.tenantId);
    const email = EmailMessage.create(rawEmail);

    let ragSnippets: string[] = [];
    if (this.personalBrains) {
      const brain = this.personalBrains.get(ctx.tenantId, 'mail');
      const recall = await brain.recall(
        `${rawEmail.subject ?? ''} ${rawEmail.from}`.trim()
      );
      ragSnippets = recall.snippets;
    }

    const classification = await this.classifier.classify(rawEmail, {
      customerName: context.customerName,
      recentOrderCount: context.recentOrderCount,
      priorEmailCount: context.priorEmailCount,
      ragSnippets,
    });

    email.markAsProcessed(classification.riskLevel);
    const savedEmail = await this.emailRepository.create(email, {
      tenantId: ctx.tenantId,
      category: classification.category,
      confidence: classification.confidence,
      messageId: rawEmail.messageId,
    });

    if (isMailPeerEnabled() && this.peerBridge?.isAvailable()) {
      try {
        await this.peerBridge.runSpecialist({
          tenantId: ctx.tenantId,
          agentKey: 'mail',
          intent: 'EMAIL_SUMMARY',
          command: `${rawEmail.subject ?? ''} from ${rawEmail.from}`,
          contextSnippets: ragSnippets,
          handlerResult: `Email classified as ${classification.category}`,
          actorId: ctx.actorId,
        });
      } catch {
        // Peer specialist run is best-effort
      }
    }

    let approvalId: string | undefined;
    let autoSent = false;

    const policyDecision = policyEngine.evaluate('email.auto_reply', {
      category: classification.category,
      confidence: classification.confidence,
    });

    const autonomyDecision = merchantAutonomyKernel.evaluate({
      tenantId: ctx.tenantId,
      module: 'aether-mail',
      action: 'email.auto_reply',
      context: {
        category: classification.category,
        confidence: classification.confidence,
        riskLevel: classification.riskLevel,
      },
      actorId: ctx.actorId,
    });
    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'aether-mail',
      action: 'autonomy_decide',
      actor: ctx.actorId,
      details: {
        stage: AutonomyLoop.nextAfterDecision(autonomyDecision.action === 'approval_required'),
        decision: autonomyDecision.action,
        category: classification.category,
      },
    });

    await merchantAutonomyKernel.recordDecision(
      {
        tenantId: ctx.tenantId,
        module: 'aether-mail',
        action: 'email.auto_reply',
        context: { category: classification.category },
        actorId: ctx.actorId,
      },
      autonomyDecision
    );

    const heuristicPath = classification.source === 'heuristic';

    const canAutoReply =
      autonomyDecision.action === 'execute' &&
      !heuristicPath &&
      classification.riskLevel !== 'high' &&
      this.policyService.canAutoReply(classification.category, classification.confidence) &&
      !policyDecision.requiresApproval;

    if (!canAutoReply) {
      savedEmail.escalate();
      await this.emailRepository.update(savedEmail, {
        status: 'escalated',
        riskLevel: 'high',
        category: classification.category,
        confidence: classification.confidence,
      });

      const approval = await createApproval({
        tenantId: ctx.tenantId,
        module: 'aether-mail',
        actionType: 'email_response',
        payload: {
          emailId: savedEmail.id,
          from: rawEmail.from,
          subject: rawEmail.subject,
          category: classification.category,
          context,
        },
        requestedBy: ctx.actorId,
      });
      approvalId = approval.id;
      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'aether-mail',
        action: 'autonomy_approve',
        actor: ctx.actorId,
        details: { approvalId, emailId: savedEmail.id },
      });
    } else {
      const draftReply = this.policyService.buildAutoReply(classification.category);
      const sendResult = await this.mailSender.send({
        to: rawEmail.from,
        subject: `Re: ${rawEmail.subject ?? 'Your inquiry'}`,
        body: draftReply,
      });

      savedEmail.markAsReplied();
      await this.emailRepository.update(savedEmail, {
        status: sendResult.sent ? 'replied' : 'draft_ready',
        draftReply,
        sentAt: sendResult.sent ? new Date() : undefined,
      });
      autoSent = sendResult.sent;
      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'aether-mail',
        action: 'autonomy_execute',
        actor: ctx.actorId,
        details: { emailId: savedEmail.id, autoSent },
      });
    }

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'aether-mail',
      action: 'email_processed',
      actor: ctx.actorId,
      details: {
        emailId: savedEmail.id,
        classification,
        contextSource: context.source,
        autoSent,
      },
    });

    await this.orchestratorPort.execute({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      task: 'mail.classify',
      input: { emailId: savedEmail.id, category: classification.category, autoSent },
    });

    if (this.personalBrains) {
      const brain = this.personalBrains.get(ctx.tenantId, 'mail');
      await brain.remember({
        command: `email from ${rawEmail.from}: ${rawEmail.subject ?? ''}`,
        intent: classification.category,
        result: `${savedEmail.status}${autoSent ? ':auto_sent' : ''}`,
      });
    }

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'aether-mail',
      action: 'autonomy_measure',
      actor: ctx.actorId,
      details: { emailId: savedEmail.id, status: savedEmail.status, autoSent },
    });

    return Object.assign(savedEmail, { approvalId, contextSource: context.source, autoSent });
  }
}
