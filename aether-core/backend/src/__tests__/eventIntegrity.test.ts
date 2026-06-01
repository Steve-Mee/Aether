import { eventBus } from '../shared/events/eventBus';
import { prisma } from '../shared/prisma/client';
import { registerEventHandlers } from '../bootstrap/eventHandlers';
import { assertAllRequiredHandlersRegistered } from '../shared/events/eventHandlerRegistry';
import { isBlockedOutcomeSource } from '../shared/outcomes/OutcomeVerificationService';

jest.mock('../shared/prisma/client', () => ({
  prisma: {
    domainEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(({ data }) =>
        Promise.resolve({ id: 'evt_1', ...data })
      ),
      update: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    outcomeRecord: { findFirst: jest.fn().mockResolvedValue(null) },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

jest.mock('../shared/billing/billingService', () => ({
  recordBillableOutcome: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../ai/attribution/OutcomeEngine', () => ({
  recordOutcome: jest.fn().mockResolvedValue({ id: 'out_1', uplift: 0 }),
}));

describe('eventBus idempotency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    eventBus.resetHandlersForTests();
  });

  it('deduplicates publish with same idempotencyKey', async () => {
    (prisma.domainEvent.findFirst as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'existing',
    });

    await eventBus.publish({
      tenantId: 'tenant_a',
      type: 'outcome.verified',
      payload: { recordId: 'r1', status: 'verified' },
      idempotencyKey: 'outcome.verified:r1:verified',
    });

    await eventBus.publish({
      tenantId: 'tenant_a',
      type: 'outcome.verified',
      payload: { recordId: 'r1', status: 'verified' },
      idempotencyKey: 'outcome.verified:r1:verified',
    });

    expect(prisma.domainEvent.create).toHaveBeenCalledTimes(1);
  });
});

describe('event handler registry', () => {
  beforeEach(() => {
    eventBus.resetHandlersForTests();
  });

  it('registers all required handlers after bootstrap registration', () => {
    registerEventHandlers();
    expect(() => assertAllRequiredHandlersRegistered()).not.toThrow();
  });
});

describe('outcome firewall', () => {
  it('blocks admin price update sources', () => {
    expect(isBlockedOutcomeSource('admin.price_update')).toBe(true);
    expect(isBlockedOutcomeSource('command.executed')).toBe(true);
    expect(isBlockedOutcomeSource('mail.processed')).toBe(false);
  });
});

describe('event handler completion before processedAt', () => {
  beforeEach(() => {
    eventBus.resetHandlersForTests();
    jest.clearAllMocks();
  });

  afterEach(() => {
    eventBus.resetHandlersForTests();
  });

  it('does not set processedAt when a handler throws', async () => {

    eventBus.subscribe('mail.processed', async () => {
      throw new Error('handler_failed_test');
    });

    await expect(
      eventBus.publish({
        tenantId: 'tenant_a',
        type: 'mail.processed',
        payload: { emailId: 'em_fail' },
      })
    ).rejects.toThrow('handler_failed_test');

    expect(prisma.domainEvent.update).not.toHaveBeenCalled();
  });
});

describe('event outbox replay', () => {
  beforeEach(() => {
    eventBus.resetHandlersForTests();
    registerEventHandlers();
    jest.clearAllMocks();
  });

  it('replays unprocessed events after simulated crash', async () => {
    const pendingEvent = {
      id: 'evt_pending',
      tenantId: 'tenant_a',
      type: 'mail.processed',
      payload: JSON.stringify({ emailId: 'em_1', status: 'processed' }),
      idempotencyKey: null,
      processedAt: null,
      createdAt: new Date(),
    };

    (prisma.domainEvent.findMany as jest.Mock).mockResolvedValueOnce([pendingEvent]);
    (prisma.domainEvent.update as jest.Mock).mockResolvedValue({});

    const processed = await eventBus.processOutbox(10);
    expect(processed).toBe(1);
    expect(prisma.domainEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'evt_pending' } })
    );
  });
});
