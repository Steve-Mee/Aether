import { registerEventHandlers } from '../eventHandlers';
import { eventBus } from '../../shared/events/eventBus';
import { prisma } from '../../shared/prisma/client';

jest.mock('../../shared/prisma/client', () => ({
  prisma: {
    auditLog: { findFirst: jest.fn().mockResolvedValue(null) },
    outcomeRecord: { findFirst: jest.fn().mockResolvedValue(null) },
    domainEvent: {
      create: jest.fn().mockResolvedValue({ id: 'evt_1', processedAt: null }),
      update: jest.fn().mockResolvedValue({}),
    },
    tenantSettings: {
      findUnique: jest.fn().mockResolvedValue({
        brainKnowledgeTransferEnabled: null,
        brainKnowledgeGovernanceMode: 'full_loop',
        brainFederatedContributionEnabled: false,
      }),
    },
  },
}));

jest.mock('../../shared/outcomes/OutcomeVerificationService', () => ({
  recordOperationalOutcome: jest.fn().mockResolvedValue({ id: 'out_1' }),
  isBlockedOutcomeSource: jest.fn().mockReturnValue(false),
}));

jest.mock('../../shared/billing/billingService', () => ({
  recordBillableOutcome: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../ai/orchestrator/Orchestrator', () => ({
  orchestrator: { execute: jest.fn().mockResolvedValue({ success: true, output: {} }) },
}));

jest.mock('../../shared/notifications/merchantNotificationService', () => ({
  merchantNotificationService: { notifyApprovalRequired: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../ai/intelligence/knowledge-transfer/isKnowledgeTransferEnabled', () => ({
  isKnowledgeTransferEnabledEnv: jest.fn().mockReturnValue(true),
}));

describe('registerEventHandlers', () => {
  beforeEach(() => {
    eventBus.resetHandlersForTests();
    registerEventHandlers();
  });

  it('does not call orchestrator when supplier change applied via approval', async () => {
    const { orchestrator } = require('../../ai/orchestrator/Orchestrator');
    (orchestrator.execute as jest.Mock).mockClear();

    await eventBus.publish({
      tenantId: 'tenant_default',
      type: 'supplier.price_changed',
      payload: {
        supplierId: 'sup_1',
        skipRescrape: true,
        appliedViaApproval: true,
      },
    });

    expect(orchestrator.execute).not.toHaveBeenCalled();
  });

  it('chains insight.submit on supplier auto-apply when knowledge transfer enabled', async () => {
    const { orchestrator } = require('../../ai/orchestrator/Orchestrator');
    (orchestrator.execute as jest.Mock).mockClear();

    await eventBus.publish({
      tenantId: 'tenant_default',
      type: 'supplier.price_changed',
      payload: {
        supplierId: 'sup_1',
        autoApplied: true,
        change: { type: 'price_change', sku: 'SKU-1', change: '20%' },
      },
    });

    expect(orchestrator.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        task: 'insight.submit',
        input: expect.objectContaining({
          insights: expect.arrayContaining([
            expect.objectContaining({ category: 'pricing', metric: 'auto_apply_rate' }),
          ]),
        }),
      })
    );
  });

  it('chains insight.submit on mail auto-reply via mail.processed', async () => {
    const { orchestrator } = require('../../ai/orchestrator/Orchestrator');
    (orchestrator.execute as jest.Mock).mockClear();

    await eventBus.publish({
      tenantId: 'tenant_default',
      type: 'mail.processed',
      payload: { emailId: 'email_1', autoSent: true, status: 'replied' },
    });

    expect(orchestrator.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        task: 'insight.submit',
        input: expect.objectContaining({
          insights: expect.arrayContaining([
            expect.objectContaining({ metric: 'mail_auto_reply_rate' }),
          ]),
        }),
      })
    );
  });

  it('skips insight.submit when tenant is receive_only', async () => {
    (prisma.tenantSettings.findUnique as jest.Mock).mockResolvedValue({
      brainKnowledgeTransferEnabled: true,
      brainKnowledgeGovernanceMode: 'receive_only',
    });

    const { orchestrator } = require('../../ai/orchestrator/Orchestrator');
    (orchestrator.execute as jest.Mock).mockClear();

    await eventBus.publish({
      tenantId: 'tenant_default',
      type: 'mail.processed',
      payload: { emailId: 'email_1', autoSent: true, status: 'replied' },
    });

    expect(orchestrator.execute).not.toHaveBeenCalled();
  });
});
