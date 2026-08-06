import { executeApprovedAction } from '../approvalExecutor';
import { EmailApprovalHandler } from '../handlers/emailApprovalHandler';
import { StorefrontPublishApprovalHandler } from '../handlers/storefrontPublishApprovalHandler';

jest.mock('../../prisma/client', () => ({
  prisma: {
    auditLog: { findFirst: jest.fn().mockResolvedValue(null) },
    emailMessage: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'em_1',
        from: 'buyer@example.com',
        subject: 'Help',
        category: 'order_status',
      }),
      update: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('../../audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../modules/aether-mail/infrastructure/smtp/SmtpMailSenderAdapter', () => ({
  smtpMailSender: {
    send: jest.fn().mockResolvedValue({ sent: true, messageId: 'msg_1' }),
  },
}));

describe('ApprovalExecutor', () => {
  it('EmailApprovalHandler handles aether-mail email_response', () => {
    const handler = new EmailApprovalHandler();
    expect(handler.canHandle('aether-mail', 'email_response')).toBe(true);
    expect(handler.canHandle('payment-fulfillment', 'refund')).toBe(false);
  });

  it('StorefrontPublishApprovalHandler is registered for PUBLISH_STOREFRONT', () => {
    const handler = new StorefrontPublishApprovalHandler();
    expect(handler.canHandle('storefront-builder', 'PUBLISH_STOREFRONT')).toBe(true);
  });

  it('executeApprovedAction runs email handler', async () => {
    await executeApprovedAction({
      tenantId: 'tenant_a',
      approvalId: 'appr_1',
      module: 'aether-mail',
      actionType: 'email_response',
      payload: { emailId: 'em_1', category: 'order_status' },
      resolvedBy: 'operator_1',
    });

    const { smtpMailSender } = require('../../../modules/aether-mail/infrastructure/smtp/SmtpMailSenderAdapter');
    expect(smtpMailSender.send).toHaveBeenCalled();
  });

  it('executeApprovedAction sends stored draft body when provided', async () => {
    const { prisma } = require('../../prisma/client');
    prisma.emailMessage.findFirst.mockResolvedValueOnce({
      id: 'em_1',
      from: 'buyer@example.com',
      subject: 'Help',
      category: 'order_status',
      draftReply: 'Stored draft reply',
    });

    await executeApprovedAction({
      tenantId: 'tenant_a',
      approvalId: 'appr_2',
      module: 'aether-mail',
      actionType: 'email_response',
      payload: {
        emailId: 'em_1',
        body: 'Merchant-approved draft',
        subject: 'Re: Help',
      },
      resolvedBy: 'operator_1',
    });

    const { smtpMailSender } = require('../../../modules/aether-mail/infrastructure/smtp/SmtpMailSenderAdapter');
    expect(smtpMailSender.send).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'Merchant-approved draft',
        subject: 'Re: Help',
      })
    );
  });
});
