import { registerEventHandlers } from '../eventHandlers';
import { eventBus } from '../../shared/events/eventBus';

jest.mock('../../shared/prisma/client', () => ({
  prisma: {
    auditLog: { findFirst: jest.fn().mockResolvedValue(null) },
    outcomeRecord: { findFirst: jest.fn().mockResolvedValue(null) },
    domainEvent: {
      create: jest.fn().mockResolvedValue({ id: 'evt_1', processedAt: null }),
      update: jest.fn().mockResolvedValue({}),
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
});
