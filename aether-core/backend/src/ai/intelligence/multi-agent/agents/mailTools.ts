import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { BrainToolExecutor, ToolExecutionResult } from '../../personal-brain/tools/types';
import type { EmailRepository } from '../../../../modules/aether-mail/domain/repositories/EmailRepository';
import type { LlmInferencePort } from '../../../../shared/ai/LlmInferencePort';
import { defaultOllamaInference } from '../../../../shared/ai/OllamaInferenceAdapter';
import { createApproval } from '../../../../shared/approval/approvalService';
import { writeAuditLog } from '../../../../shared/audit/auditService';

export interface MailToolsDeps {
  adminData: AdminDataPort;
  emailRepository?: EmailRepository;
  llm?: LlmInferencePort;
}

export function getEmailSummaryTool(deps: MailToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'getEmailSummary',
      description: 'Get mail inbox summary: unread and auto-replied counts',
      parameters: {},
      risk: 'low',
      kind: 'read',
      module: 'aether-mail',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx) {
      const unread = await deps.adminData.countEmailsByStatus(ctx.tenantId, [
        'received',
        'escalated',
      ]);
      const replied = await deps.adminData.countEmailsByStatus(ctx.tenantId, ['replied']);
      return {
        success: true,
        awaitingAction: unread,
        autoReplied: replied,
        message: `Mail: ${unread} awaiting action, ${replied} auto-replied`,
      };
    },
  };
}

export function getEmailContentSummaryTool(deps: MailToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'summarizeEmailContent',
      description:
        'Summarize recent unread email content with privacy boundaries. Returns merchant-safe summaries of subject lines and sender categories.',
      parameters: {
        limit: {
          type: 'number',
          required: false,
          description: 'Max number of emails to summarize (default: 5)',
        },
      },
      risk: 'low',
      kind: 'read',
      module: 'aether-mail',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, params = {}) {
      if (!deps.emailRepository) {
        return {
          success: false,
          error: 'Email repository not available',
        };
      }

      const limit = Number(params.limit ?? 5);
      const llm = deps.llm ?? defaultOllamaInference;

      const recentEmails = await deps.emailRepository.findRecent(
        ctx.tenantId,
        ['received', 'escalated'],
        limit
      );

      if (recentEmails.length === 0) {
        return {
          success: true,
          summaries: [],
          message: 'No unread emails',
        };
      }

      const summaries = recentEmails.map((email) => ({
        id: email.id,
        from: email.from,
        subject: email.subject ?? '(no subject)',
        category: email.riskLevel ?? 'unknown',
        receivedAt: email.createdAt,
      }));

      const llmSummary = await llm.generate({
        prompt: `You are summarizing merchant emails. Privacy: do NOT reveal customer PII details, only high-level patterns.

Emails:
${summaries.map((s) => `- From: ${s.from}, Subject: "${s.subject}"`).join('\n')}

Summarize in 2-3 sentences what types of inquiries are waiting (e.g., "3 order status requests, 1 product question, 1 supplier update").`,
        temperature: 0.3,
      });

      return {
        success: true,
        count: recentEmails.length,
        summaries,
        overviewText: llmSummary.trim(),
        message: `Summarized ${recentEmails.length} recent email(s)`,
      };
    },
  };
}

export function draftEmailReplyTool(deps: MailToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'draftEmailReply',
      description:
        'Draft a reply to an email using AI. This creates a draft that requires merchant approval before sending.',
      parameters: {
        emailId: {
          type: 'string',
          required: true,
          description: 'ID of the email to reply to',
        },
        context: {
          type: 'string',
          required: false,
          description: 'Additional context for the reply',
        },
      },
      risk: 'medium',
      kind: 'propose',
      module: 'aether-mail',
    },
    validate(params) {
      if (!String(params.emailId ?? '').trim()) {
        return { ok: false, error: 'emailId is required' };
      }
      return { ok: true };
    },
    async executeRead() {
      return { error: 'draftEmailReply is propose-only' };
    },
    async buildProposal(ctx, params) {
      if (!deps.emailRepository) {
        return {
          tool: 'draftEmailReply',
          summary: 'Email repository not available',
          risk: 'medium',
          requiresApproval: true,
          expectedImpact: 'none',
          confidence: 0.2,
          rationale: 'Email repository not available',
          payload: params,
        };
      }

      const llm = deps.llm ?? defaultOllamaInference;
      const emailId = String(params.emailId);
      const email = await deps.emailRepository.findById(emailId, ctx.tenantId);
      if (!email) {
        return {
          tool: 'draftEmailReply',
          summary: 'Email not found',
          risk: 'medium',
          requiresApproval: true,
          expectedImpact: 'none',
          confidence: 0.2,
          rationale: 'Email not found',
          payload: params,
        };
      }

      const context = params.context ? String(params.context) : '';
      const draftPrompt = `You are drafting a professional merchant reply to a customer email.

Customer Email:
From: ${email.from}
Subject: ${email.subject ?? '(no subject)'}
Body: ${email.body ?? '(no body)'}

${context ? `Additional context: ${context}` : ''}

Draft a polite, helpful reply (max 300 words). Keep it professional and concise.`;

      const draftReply = await llm.generate({
        prompt: draftPrompt,
        temperature: 0.4,
      });

      return {
        tool: 'draftEmailReply',
        summary: `Draft reply for ${email.from}`,
        risk: 'medium',
        requiresApproval: true,
        expectedImpact: 'Concept-antwoord; verzenden na merchant-goedkeuring',
        confidence: 0.7,
        rationale: 'AI draft requires merchant approval before send',
        payload: {
          emailId,
          to: email.from,
          subject: `Re: ${email.subject ?? 'Your inquiry'}`,
          body: draftReply.trim(),
        },
      };
    },
    async executeConfirmed(ctx, payload): Promise<ToolExecutionResult> {
      if (!deps.emailRepository) {
        return { success: false, result: '', error: 'Email repository not available' };
      }

      const emailId = String(payload.emailId ?? '').trim();
      const body = String(payload.body ?? '').trim();
      const subject = String(payload.subject ?? '').trim();
      if (!emailId || !body) {
        return { success: false, result: '', error: 'emailId and body are required' };
      }

      const email = await deps.emailRepository.findById(emailId, ctx.tenantId);
      if (!email) {
        return { success: false, result: '', error: `Email not found: ${emailId}` };
      }

      await deps.emailRepository.update(email, {
        status: 'draft_ready',
        draftReply: body,
      });

      const approval = await createApproval({
        tenantId: ctx.tenantId,
        module: 'aether-mail',
        actionType: 'email_response',
        payload: {
          emailId,
          from: String(payload.to ?? email.from),
          subject: subject || `Re: ${email.subject ?? 'Your inquiry'}`,
          body,
          source: 'draftEmailReply',
        },
        requestedBy: ctx.actorId,
      });

      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'aether-mail',
        action: 'draft_reply_persisted',
        actor: ctx.actorId,
        details: { emailId, approvalId: approval.id, source: 'draftEmailReply' },
      });

      return {
        success: true,
        result: `Draft reply saved for ${email.from}; send approval ${approval.id} created`,
        operationalMeta: { emailId, approvalId: approval.id },
      };
    },
  };
}
