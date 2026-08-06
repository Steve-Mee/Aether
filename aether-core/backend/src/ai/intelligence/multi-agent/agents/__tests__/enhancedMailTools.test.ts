import { getEmailContentSummaryTool, draftEmailReplyTool } from '../mailTools';
import type { EmailRepository } from '../../../../../modules/aether-mail/domain/repositories/EmailRepository';
import { EmailMessage } from '../../../../../modules/aether-mail/domain/entities/EmailMessage';
import type { LlmInferencePort } from '../../../../../shared/ai/LlmInferencePort';
import type { AdminDataPort } from '../../../../../modules/admin-command-bar/application/ports/AdminDataPort';

jest.mock('../../../../../shared/approval/approvalService', () => ({
  createApproval: jest.fn().mockResolvedValue({ id: 'appr_draft_1', status: 'pending' }),
}));

jest.mock('../../../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

describe('enhancedMailTools', () => {
  describe('getEmailContentSummaryTool', () => {
    it('summarizes recent emails with LLM overview', async () => {
      const mockRepo: Partial<EmailRepository> = {
        findRecent: jest.fn().mockResolvedValue([
          new EmailMessage(
            '1',
            'a@example.com',
            'Where is my order?',
            'body',
            'received',
            'low',
            new Date()
          ),
        ]),
      };
      const mockLlm: LlmInferencePort = {
        generate: jest.fn().mockResolvedValue('1 order status request waiting.'),
        model: 'test',
      };
      const tool = getEmailContentSummaryTool({
        adminData: {} as AdminDataPort,
        emailRepository: mockRepo as EmailRepository,
        llm: mockLlm,
      });
      const result = (await tool.executeRead({ tenantId: 't1' }, { limit: 5 })) as Record<
        string,
        unknown
      >;
      expect(result.success).toBe(true);
      expect(result.overviewText).toContain('order status');
    });

    it('returns empty when no emails', async () => {
      const mockRepo: Partial<EmailRepository> = {
        findRecent: jest.fn().mockResolvedValue([]),
      };
      const tool = getEmailContentSummaryTool({
        adminData: {} as AdminDataPort,
        emailRepository: mockRepo as EmailRepository,
      });
      const result = (await tool.executeRead({ tenantId: 't1' }, {})) as Record<string, unknown>;
      expect(result.success).toBe(true);
      expect(result.message).toBe('No unread emails');
    });

    it('fails when repository missing', async () => {
      const tool = getEmailContentSummaryTool({ adminData: {} as AdminDataPort });
      const result = (await tool.executeRead({ tenantId: 't1' }, {})) as Record<string, unknown>;
      expect(result.success).toBe(false);
    });
  });

  describe('draftEmailReplyTool', () => {
    it('creates draft reply proposal using LLM', async () => {
      const mockRepo: Partial<EmailRepository> = {
        findById: jest.fn().mockResolvedValue(
          new EmailMessage(
            '1',
            'customer@example.com',
            'Order question',
            'When will my order ship?',
            'received',
            'low',
            new Date()
          )
        ),
      };
      const mockLlm: LlmInferencePort = {
        generate: jest
          .fn()
          .mockResolvedValue(
            'Thank you for your inquiry. Your order will ship within 2-3 business days.'
          ),
        model: 'test',
      };
      const tool = draftEmailReplyTool({
        adminData: {} as AdminDataPort,
        emailRepository: mockRepo as EmailRepository,
        llm: mockLlm,
      });
      const proposal = await tool.buildProposal!(
        { tenantId: 'test-tenant', actorId: 'test-actor' },
        { emailId: '1', context: 'Standard shipping timeframe' }
      );
      expect(proposal.requiresApproval).toBe(true);
      expect(proposal.payload.to).toBe('customer@example.com');
      expect(String(proposal.payload.body)).toContain('Thank you');
    });

    it('validates emailId parameter', () => {
      const tool = draftEmailReplyTool({ adminData: {} as AdminDataPort });
      const validation = tool.validate({});
      expect(validation.ok).toBe(false);
    });

    it('marks missing email in proposal rationale', async () => {
      const mockRepo: Partial<EmailRepository> = {
        findById: jest.fn().mockResolvedValue(null),
      };
      const tool = draftEmailReplyTool({
        adminData: {} as AdminDataPort,
        emailRepository: mockRepo as EmailRepository,
      });
      const proposal = await tool.buildProposal!(
        { tenantId: 'test-tenant' },
        { emailId: 'nonexistent' }
      );
      expect(proposal.rationale).toBe('Email not found');
    });

    it('executeConfirmed persists draft and creates send approval', async () => {
      const email = new EmailMessage(
        'em_1',
        'customer@example.com',
        'Order question',
        'When will my order ship?',
        'received',
        'low',
        new Date()
      );
      const mockRepo: Partial<EmailRepository> = {
        findById: jest.fn().mockResolvedValue(email),
        update: jest.fn().mockResolvedValue(email),
      };
      const tool = draftEmailReplyTool({
        adminData: {} as AdminDataPort,
        emailRepository: mockRepo as EmailRepository,
      });
      const { createApproval } = require('../../../../../shared/approval/approvalService');

      const result = await tool.executeConfirmed!(
        { tenantId: 'test-tenant', actorId: 'merchant_1' },
        {
          emailId: 'em_1',
          to: 'customer@example.com',
          subject: 'Re: Order question',
          body: 'Your order ships tomorrow.',
        }
      );

      expect(result.success).toBe(true);
      expect(mockRepo.update).toHaveBeenCalledWith(
        email,
        expect.objectContaining({
          status: 'draft_ready',
          draftReply: 'Your order ships tomorrow.',
        })
      );
      expect(createApproval).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'test-tenant',
          module: 'aether-mail',
          actionType: 'email_response',
          payload: expect.objectContaining({
            emailId: 'em_1',
            body: 'Your order ships tomorrow.',
          }),
        })
      );
      expect(result.operationalMeta).toEqual(
        expect.objectContaining({ emailId: 'em_1', approvalId: 'appr_draft_1' })
      );
    });

    it('executeConfirmed fails without email repository', async () => {
      const tool = draftEmailReplyTool({ adminData: {} as AdminDataPort });
      const result = await tool.executeConfirmed!(
        { tenantId: 'test-tenant' },
        { emailId: 'em_1', body: 'Hi' }
      );
      expect(result.success).toBe(false);
    });
  });
});
