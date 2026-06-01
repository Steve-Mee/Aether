jest.mock('../../../shared/prisma/client', () => ({
  prisma: {
    product: {
      findMany: jest.fn().mockResolvedValue([{ id: 'p1', price: 10, stock: 5 }]),
      update: jest.fn().mockResolvedValue({}),
    },
    approval: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'a1', payload: JSON.stringify({ riskLevel: 'low' }) },
        { id: 'a2', payload: JSON.stringify({ riskLevel: 'high' }) },
      ]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      count: jest.fn().mockResolvedValue(1),
    },
    inventoryItem: { findMany: jest.fn().mockResolvedValue([{ quantity: 5 }, { quantity: 15 }]) },
    order: {
      findMany: jest.fn().mockResolvedValue([{ status: 'pending' }]),
    },
    supplier: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'sup_1', name: 'acme.com' }),
    },
    forecast: { count: jest.fn().mockResolvedValue(3) },
    outcomeRecord: {
      count: jest.fn().mockResolvedValue(2),
      findFirst: jest.fn().mockResolvedValue({ id: 'out_1', metric: 'revenue', confidence: 0.8 }),
    },
    emailMessage: { count: jest.fn().mockResolvedValue(0) },
  },
}));

jest.mock('../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../ai/orchestrator/Orchestrator', () => ({
  orchestrator: { execute: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('../../../shared/outcomes/OutcomeVerificationService', () => ({
  verifyOutcomeWithEvidence: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../../ai/attribution/OutcomeEngine', () => ({
  computeIncrementalRevenueUplift: jest.fn().mockResolvedValue(100),
}));

jest.mock('../infrastructure/persistence/PrismaCommandLogRepository', () => ({
  PrismaCommandLogRepository: jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue(undefined),
  })),
}));

import { ExecuteNaturalLanguageCommandUseCase } from '../application/use-cases/ExecuteNaturalLanguageCommandUseCase';
import type { AdminDataPort } from '../application/ports/AdminDataPort';

import type { SupplierMonitorPort } from '../application/ports/SupplierMonitorPort';

const mockSupplierMonitor: SupplierMonitorPort = {
  monitorSupplier: jest.fn().mockResolvedValue({ changeCount: 0 }),
};

const mockAdminData: AdminDataPort = {
  countProducts: jest.fn().mockResolvedValue(0),
  countLowMarginProducts: jest.fn().mockResolvedValue(0),
  updateProductPrices: jest.fn().mockResolvedValue(1),
  listInventoryItems: jest.fn().mockResolvedValue([{ quantity: 5 }, { quantity: 15 }]),
  listRecentOrders: jest.fn().mockResolvedValue([{ status: 'pending' }]),
  countEmailsByStatus: jest.fn().mockResolvedValue(0),
  countOutcomesByStatus: jest.fn().mockResolvedValue(2),
  countForecasts: jest.fn().mockResolvedValue(3),
  countPendingApprovals: jest.fn().mockResolvedValue(1),
  listPendingApprovals: jest.fn().mockResolvedValue([
    { id: 'a1', payload: JSON.stringify({ riskLevel: 'low' }) },
    { id: 'a2', payload: JSON.stringify({ riskLevel: 'high' }) },
  ]),
  approveLowRisk: jest.fn().mockResolvedValue(1),
  createSupplier: jest.fn().mockResolvedValue({ id: 'sup_1', name: 'acme.com' }),
  listSuppliers: jest.fn().mockResolvedValue([]),
  findLatestProposedOutcome: jest.fn().mockResolvedValue({ id: 'out_1', metric: 'revenue', confidence: 0.8 }),
  countRecentCommands: jest.fn().mockResolvedValue(0),
  listLowStockInventory: jest.fn().mockResolvedValue([]),
};

const mockCommandLog = {
  save: jest.fn().mockResolvedValue(undefined),
  findRecent: jest.fn().mockResolvedValue([]),
};

function createUseCase() {
  return new ExecuteNaturalLanguageCommandUseCase(mockSupplierMonitor, mockAdminData, mockCommandLog);
}

describe('ExecuteNaturalLanguageCommandUseCase', () => {
  it('handles inventory status intent via pattern match', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute('show inventory status', {
      tenantId: 'tenant_default',
    });
    expect(result.parsedIntent).toBe('INVENTORY_STATUS');
    expect(result.result).toContain('Inventory');
  });

  it('handles price update intent', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute('verhoog prijs met 10%', {
      tenantId: 'tenant_default',
    });
    expect(result.parsedIntent).toBe('PRICE_UPDATE');
    expect(result.success).toBe(true);
  });

  it('handles order status intent via pattern match', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute('order status overzicht', {
      tenantId: 'tenant_default',
    });
    expect(result.parsedIntent).toBe('ORDER_STATUS');
    expect(result.result).toContain('orders');
  });

  it('handles approve changes intent with low-risk filter', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute('approve pending changes', {
      tenantId: 'tenant_default',
    });
    expect(result.parsedIntent).toBe('APPROVE_CHANGES');
    expect(result.result).toContain('low-risk');
  });

  it('handles forecast intent', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute('show demand forecast', {
      tenantId: 'tenant_default',
    });
    expect(result.parsedIntent).toBe('FORECAST');
    expect(result.result).toContain('forecasts');
  });

  it('handles supplier create intent', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute('create supplier acme.com', {
      tenantId: 'tenant_default',
    });
    expect(result.parsedIntent).toBe('SUPPLIER_CREATE');
    expect(result.success).toBe(true);
  });

  it('handles outcome verify intent via evidence gate', async () => {
    const useCase = createUseCase();
    const result = await useCase.execute('verify outcome uplift', {
      tenantId: 'tenant_default',
    });
    expect(result.parsedIntent).toBe('OUTCOME_VERIFY');
    expect(result.result).toContain('Verified outcome');
  });
});
