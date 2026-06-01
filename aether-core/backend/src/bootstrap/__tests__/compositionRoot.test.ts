jest.mock('../../shared/prisma/client', () => ({
  prisma: {
    inventoryItem: { upsert: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    product: { updateMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn(), findFirst: jest.fn().mockResolvedValue(null) },
    supplier: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    supplierProduct: { upsert: jest.fn() },
    supplierChange: { create: jest.fn() },
    domainEvent: {
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'evt_1' }),
      update: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    outcomeRecord: { findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    approval: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), updateMany: jest.fn() },
    command: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
    emailMessage: { count: jest.fn().mockResolvedValue(0) },
    order: { findMany: jest.fn().mockResolvedValue([]) },
    forecast: { count: jest.fn().mockResolvedValue(0) },
    payment: { create: jest.fn(), findFirst: jest.fn(), updateMany: jest.fn() },
    fulfillment: { create: jest.fn() },
    insight: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    improvementProposal: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]), findFirst: jest.fn(), update: jest.fn(), count: jest.fn().mockResolvedValue(0) },
    merchantShare: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    marketplaceListing: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn() },
    physicalLocation: { create: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    supplierWebhookEvent: { create: jest.fn() },
    negotiation: { create: jest.fn(), findById: jest.fn(), findActive: jest.fn().mockResolvedValue([]), addOffer: jest.fn() },
    privacyBudget: { upsert: jest.fn().mockResolvedValue({ spent: 0, budgetLimit: 100 }), update: jest.fn() },
  },
}));

jest.mock('../../modules/supplier-intelligence/application/use-cases/MonitorSupplierUseCase', () => ({
  MonitorSupplierUseCase: jest.fn().mockImplementation(() => ({
    execute: jest.fn().mockResolvedValue({ changes: [] }),
  })),
}));

jest.mock('../../modules/supplier-intelligence/infrastructure/persistence/PrismaSupplierRepository', () => ({
  PrismaSupplierRepository: jest.fn(),
}));

jest.mock('../../modules/supplier-intelligence/application/services/WebScraperService', () => ({
  WebScraperService: jest.fn(),
}));

jest.mock('../../modules/supplier-intelligence/application/services/PriceChangeDetectorService', () => ({
  PriceChangeDetectorService: jest.fn(),
}));

jest.mock('../../shared/events/eventBus', () => {
  const handlers = new Map<string, Function[]>();
  return {
    eventBus: {
      subscribe: (type: string, handler: Function) => {
        const list = handlers.get(type) ?? [];
        list.push(handler);
        handlers.set(type, list);
      },
      publish: jest.fn().mockImplementation(async (event: { type: string }) => {
        const list = handlers.get(event.type) ?? [];
        for (const h of list) await h(event);
      }),
      processOutbox: jest.fn().mockResolvedValue(0),
    },
  };
});

import { bootstrapApplication, getCompositionRoot } from '../compositionRoot';
import { assertAllRequiredHandlersRegistered } from '../../shared/events/eventHandlerRegistry';

describe('compositionRoot', () => {
  it('bootstraps application wiring and required event handlers', () => {
    const root = bootstrapApplication();
    expect(root.executeNaturalLanguageCommand).toBeDefined();
    expect(root.updateInventory).toBeDefined();
    expect(root.applyDynamicPrice).toBeDefined();
    expect(root.supplierMonitor).toBeDefined();
    expect(root.paymentService).toBeDefined();
    expect(root.startNegotiation).toBeDefined();
    expect(() => assertAllRequiredHandlersRegistered()).not.toThrow();
    expect(getCompositionRoot()).toBe(root);
  });
});
