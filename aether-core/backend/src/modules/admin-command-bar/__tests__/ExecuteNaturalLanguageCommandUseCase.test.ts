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
    tenantSettings: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    brainToolProposal: {
      create: jest.fn().mockResolvedValue({ id: 'prop_test' }),
      updateMany: jest.fn(),
    },
    brainAgentRun: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    command: { create: jest.fn().mockResolvedValue({ id: 'cmd_test' }) },
  },
}));

jest.mock('../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../ai/orchestrator/Orchestrator', () => ({
  orchestrator: { execute: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('../../../ai/orchestrator/WorkflowEngine', () => ({
  workflowEngine: {
    startRun: jest.fn().mockResolvedValue('run_test'),
    addStep: jest.fn().mockResolvedValue(undefined),
  },
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
import type { AgentRuntimePort } from '../../../ai/intelligence/agent-runtime/AgentRuntimePort';
import type { AgentSupervisorPort } from '../../../ai/intelligence/multi-agent/AgentSupervisorPort';
import type { SpecialistAgentDefinition } from '../../../ai/intelligence/multi-agent/types';

import type { SupplierMonitorPort } from '../application/ports/SupplierMonitorPort';

const mockSupplierMonitor: SupplierMonitorPort = {
  monitorSupplier: jest.fn().mockResolvedValue({ changeCount: 0 }),
};

const mockAdminData: AdminDataPort = {
  countProducts: jest.fn().mockResolvedValue(0),
  countLowMarginProducts: jest.fn().mockResolvedValue(0),
  updateProductPrices: jest.fn().mockResolvedValue(1),
  updateProductPricesByIds: jest.fn().mockResolvedValue(1),
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
  listProductsForBrain: jest.fn().mockResolvedValue([]),
  searchProductsByName: jest.fn().mockResolvedValue([]),
  restoreProductPrices: jest.fn().mockResolvedValue(0),
  applyRestockUpdates: jest.fn().mockResolvedValue(0),
};

const mockCommandLog = {
  save: jest.fn().mockResolvedValue({ id: 'cmd_1' }),
  findRecent: jest.fn().mockResolvedValue([]),
  findById: jest.fn().mockResolvedValue(null),
};

const mockAgentRuntime: AgentRuntimePort = {
  processCommand: jest.fn().mockResolvedValue({
    parsed: { intent: 'UNKNOWN', action: null, parameters: {}, confidence: 0, source: 'none' },
    contextSnippets: [],
  }),
};

function createUseCase(agentSupervisor?: AgentSupervisorPort) {
  return new ExecuteNaturalLanguageCommandUseCase(
    mockSupplierMonitor,
    mockAdminData,
    mockCommandLog,
    {
      agentRuntime: mockAgentRuntime,
      brainResponse: {
        generateResponse: jest.fn().mockImplementation(async ({ handlerResult }) => ({
          narrative: handlerResult,
        })),
      } as any,
      personalBrainRegistry: {
        get: jest.fn().mockReturnValue({
          remember: jest.fn().mockResolvedValue('mem_test_id'),
        }),
      } as any,
      agentSupervisor,
    }
  );
}

function mockSpecialistDef(agentKey: string, supportedIntents: string[]): SpecialistAgentDefinition {
  return {
    agentKey,
    displayName: `${agentKey} agent`,
    rolePrompt: 'test',
    supportedIntents,
    allowedTools: [],
    memoryNamespace: agentKey,
  };
}

function createMockAgentSupervisor(
  agentKey: string,
  supportedIntents: string[],
): AgentSupervisorPort {
  const def = mockSpecialistDef(agentKey, supportedIntents);
  return {
    isDelegationEnabled: jest.fn().mockReturnValue(true),
    resolveTargetAgent: jest.fn().mockReturnValue(agentKey),
    routeDecision: jest.fn().mockResolvedValue({
      agent: def,
      agentKey,
      confidence: 0.95,
      reason: 'intent match',
      source: 'intent',
    }),
    route: jest.fn().mockResolvedValue(def),
    executeSpecialist: jest.fn().mockResolvedValue({
      narrative: `${agentKey} specialist narrative`,
      agentRunId: `run_${agentKey}`,
      toolTrace: [],
      pendingActions: [],
    }),
    delegate: jest.fn(),
    resumeFromChild: jest.fn(),
    listDelegations: jest.fn().mockResolvedValue([]),
  };
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

  it('returns brain metadata when commandBrain is wired', async () => {
    const useCase = new ExecuteNaturalLanguageCommandUseCase(
      mockSupplierMonitor,
      mockAdminData,
      mockCommandLog,
      {
        agentRuntime: mockAgentRuntime,
        commandBrain: {
          prepareCommand: jest.fn().mockResolvedValue({
            contextSnippets: ['[product] Test | price=10 EUR'],
            recallMatches: [{ id: 'product:1', score: 0.9 }],
          }),
        } as any,
        brainResponse: {
          generateResponse: jest.fn().mockResolvedValue({
            narrative: 'Brain narrative',
            actionProposal: 'Do something',
          }),
        } as any,
        personalBrainRegistry: {
          get: jest.fn().mockReturnValue({
            remember: jest.fn().mockResolvedValue('mem_brain_1'),
          }),
        } as any,
      }
    );

    const result = await useCase.execute('show inventory status', {
      tenantId: 'tenant_default',
    });

    expect(result.brain).toBeDefined();
    expect(result.brain!.contextSnippets).toContain('[product] Test | price=10 EUR');
    expect(result.brain!.actionProposal).toBe('Do something');
    expect(result.result).toBe('Brain narrative');
  });

  describe('multi-agent specialist delegation', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('routes inventory status to inventory specialist and skips legacy handler', async () => {
      const supervisor = createMockAgentSupervisor('inventory', ['INVENTORY_STATUS']);
      const useCase = createUseCase(supervisor);

      const result = await useCase.execute('show inventory status', {
        tenantId: 'tenant_default',
      });

      expect(result.parsedIntent).toBe('INVENTORY_STATUS');
      expect(result.brain?.specialist?.agentKey).toBe('inventory');
      expect(result.brain?.executionMode).toBe('single');
      expect(result.result).toBe('inventory specialist narrative');
      expect(mockAdminData.listInventoryItems).not.toHaveBeenCalled();
      expect(supervisor.executeSpecialist).toHaveBeenCalledWith(
        expect.objectContaining({ agentKey: 'inventory', intent: 'INVENTORY_STATUS' })
      );
    });

    it('routes email summary to mail specialist', async () => {
      const supervisor = createMockAgentSupervisor('mail', ['EMAIL_SUMMARY']);
      const useCase = createUseCase(supervisor);

      const result = await useCase.execute('email summary overzicht', {
        tenantId: 'tenant_default',
      });

      expect(result.parsedIntent).toBe('EMAIL_SUMMARY');
      expect(result.brain?.specialist?.agentKey).toBe('mail');
      expect(result.result).toBe('mail specialist narrative');
      expect(mockAdminData.countEmailsByStatus).not.toHaveBeenCalled();
    });

    it('routes supplier create to supplier specialist', async () => {
      const supervisor = createMockAgentSupervisor('supplier', ['SUPPLIER_CREATE']);
      const useCase = createUseCase(supervisor);

      const result = await useCase.execute('create supplier acme.com', {
        tenantId: 'tenant_default',
      });

      expect(result.parsedIntent).toBe('SUPPLIER_CREATE');
      expect(result.brain?.specialist?.agentKey).toBe('supplier');
      expect(result.result).toBe('supplier specialist narrative');
      expect(mockAdminData.createSupplier).not.toHaveBeenCalled();
    });

    it('routes restock suggest to inventory specialist', async () => {
      const supervisor = createMockAgentSupervisor('inventory', ['RESTOCK_SUGGEST']);
      const useCase = createUseCase(supervisor);

      const result = await useCase.execute('restock low stock items', {
        tenantId: 'tenant_default',
      });

      expect(result.parsedIntent).toBe('RESTOCK_SUGGEST');
      expect(result.brain?.specialist?.agentKey).toBe('inventory');
      expect(mockAdminData.applyRestockUpdates).not.toHaveBeenCalled();
    });
  });
});
