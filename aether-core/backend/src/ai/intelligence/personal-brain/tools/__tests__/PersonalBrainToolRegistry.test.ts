import { PersonalBrainToolRegistry } from '../PersonalBrainToolRegistry';
import { createInMemoryIntelligenceLayer } from '../../../createIntelligenceLayer';
import type { AdminDataPort } from '../../../../../modules/admin-command-bar/application/ports/AdminDataPort';

jest.mock('../BrainToolProposalStore', () => ({
  createBrainToolProposal: jest.fn(),
  proposalTtlMinutes: () => 15,
}));

jest.mock('../../../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../../../shared/approval/approvalService', () => ({
  createApproval: jest.fn(),
}));

import { createBrainToolProposal } from '../BrainToolProposalStore';
import { createApproval } from '../../../../../shared/approval/approvalService';
import { writeAuditLog } from '../../../../../shared/audit/auditService';

describe('PersonalBrainToolRegistry', () => {
  const layer = createInMemoryIntelligenceLayer();

  const mockAdminData: AdminDataPort = {
    countProducts: jest.fn(),
    countLowMarginProducts: jest.fn(),
    updateProductPrices: jest.fn(),
    updateProductPricesByIds: jest.fn(),
    restoreProductPrices: jest.fn(),
    listInventoryItems: jest.fn(),
    listRecentOrders: jest.fn(),
    countEmailsByStatus: jest.fn(),
    countOutcomesByStatus: jest.fn(),
    countForecasts: jest.fn(),
    countPendingApprovals: jest.fn(),
    listPendingApprovals: jest.fn().mockResolvedValue([
      {
        id: 'ap1',
        payload: JSON.stringify({ summary: 'Prijs wijzigen', risk: 'high' }),
        module: 'admin-command-bar',
        actionType: 'brain.updatePrice',
        createdAt: new Date('2026-06-26'),
      },
    ]),
    approveLowRisk: jest.fn(),
    createSupplier: jest.fn(),
    createProduct: jest.fn(),
    listSuppliers: jest.fn(),
    findLatestProposedOutcome: jest.fn(),
    countRecentCommands: jest.fn(),
    listLowStockInventory: jest.fn(),
    listProductsForBrain: jest.fn(),
    searchProductsByName: jest.fn().mockResolvedValue([
      { id: 'p1', name: 'Widget', price: 10, stock: 5, slug: 'widget' },
    ]),
  } as unknown as AdminDataPort;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lists default tools including getPendingApprovals and executeLowRiskAction', () => {
    const registry = new PersonalBrainToolRegistry({
      adminData: mockAdminData,
      personalBrains: layer.personalBrainRegistry,
    });
    const names = registry.list().map((t) => t.name);
    expect(names).toContain('updatePrice');
    expect(names).toContain('getProductInfo');
    expect(names).toContain('getPendingApprovals');
    expect(names).toContain('executeLowRiskAction');
    expect(names).toContain('createApproval');
  });

  it('executes read tool search_products and logs brain_tool_called', async () => {
    const registry = new PersonalBrainToolRegistry({
      adminData: mockAdminData,
      personalBrains: layer.personalBrainRegistry,
    });
    const result = await registry.execute(
      { tool: 'search_products', input: { query: 'Widget' } },
      { tenantId: 'tenant_tools' }
    );
    expect(result.trace.status).toBe('ok');
    expect(result.output).toContain('Widget');
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'brain_tool_called', details: expect.objectContaining({ tool: 'search_products' }) })
    );
  });

  it('executes getPendingApprovals read tool', async () => {
    const registry = new PersonalBrainToolRegistry({
      adminData: mockAdminData,
      personalBrains: layer.personalBrainRegistry,
    });
    const result = await registry.execute(
      { tool: 'getPendingApprovals', input: {} },
      { tenantId: 'tenant_tools' }
    );
    expect(result.trace.status).toBe('ok');
    expect(result.output).toContain('ap1');
    expect(mockAdminData.listPendingApprovals).toHaveBeenCalled();
  });

  it('createApproval creates approval directly without proposal wrapper', async () => {
    (createApproval as jest.Mock).mockResolvedValue({ id: 'new-ap', status: 'pending' });

    const registry = new PersonalBrainToolRegistry({
      adminData: mockAdminData,
      personalBrains: layer.personalBrainRegistry,
    });
    const result = await registry.execute(
      {
        tool: 'createApproval',
        input: {
          module: 'admin-command-bar',
          actionType: 'price.change',
          summary: 'Grote prijswijziging',
        },
      },
      { tenantId: 'tenant_tools', actorId: 'user1' }
    );

    expect(result.trace.status).toBe('ok');
    expect(result.proposal).toBeUndefined();
    expect(createApproval).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant_tools',
        module: 'admin-command-bar',
        actionType: 'price.change',
      })
    );
    expect(createBrainToolProposal).not.toHaveBeenCalled();
    expect(writeAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'brain_approval_created' })
    );
  });

  it('propose updatePrice creates proposal with enriched metadata', async () => {
    (createBrainToolProposal as jest.Mock).mockResolvedValue({
      proposalId: 'prop1',
      tool: 'updatePrice',
      summary: 'Prijs verhogen',
      risk: 'high',
      requiresApproval: true,
      payload: {},
      approvalId: 'ap1',
    });

    const registry = new PersonalBrainToolRegistry({
      adminData: mockAdminData,
      personalBrains: layer.personalBrainRegistry,
    });
    const result = await registry.execute(
      { tool: 'updatePrice', input: { product: 'Widget', percentage: 15 } },
      { tenantId: 'tenant_tools', actorId: 'user1' }
    );

    expect(result.trace.status).toBe('proposed');
    expect(createBrainToolProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        tool: 'updatePrice',
        risk: 'high',
        expectedImpact: expect.stringContaining('15%'),
        confidence: expect.any(Number),
      })
    );
    expect(result.proposal?.approvalId).toBe('ap1');
  });

  it('rejects invalid input', async () => {
    const registry = new PersonalBrainToolRegistry({
      adminData: mockAdminData,
      personalBrains: layer.personalBrainRegistry,
    });
    const result = await registry.execute(
      { tool: 'search_products', input: {} },
      { tenantId: 'tenant_tools' }
    );
    expect(result.trace.status).toBe('error');
  });
});
