import { MonitorSupplierUseCase } from '../application/use-cases/MonitorSupplierUseCase';
import { SupplierDecisionEngine } from '../application/services/SupplierDecisionEngine';
import { SupplierProduct } from '../domain/entities/SupplierProduct';

jest.mock('../../../shared/approval/approvalService', () => ({
  createApproval: jest.fn().mockResolvedValue({ id: 'appr_1' }),
}));

jest.mock('../../../shared/audit/auditService', () => ({
  writeAuditLog: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('../../../ai/orchestrator/Orchestrator', () => ({
  orchestrator: { execute: jest.fn().mockResolvedValue({ success: true }) },
}));

jest.mock('../../../shared/prisma/client', () => ({
  prisma: {
    supplierChange: { create: jest.fn().mockResolvedValue({ id: 'chg_1' }) },
  },
}));

describe('MonitorSupplierUseCase', () => {
  const supplier = { id: 'sup_1', name: 'Acme', website: 'https://acme.test' };
  const existing = [
    new SupplierProduct('p1', 'sup_1', 'Widget', 'SKU-1', 10, 'EUR', 5, new Date()),
  ];
  const scraped = [
    new SupplierProduct('p2', 'sup_1', 'Widget', 'SKU-1', 12, 'EUR', 5, new Date()),
  ];

  const mockRepo = {
    findById: jest.fn().mockResolvedValue(supplier),
    findProductsBySupplier: jest.fn().mockResolvedValue(existing),
    saveProduct: jest.fn().mockResolvedValue(undefined),
  };
  const mockScraper = { scrape: jest.fn().mockResolvedValue(scraped) };
  const mockDetector = {
    detectChanges: jest.fn().mockReturnValue([
      { type: 'price_change', sku: 'SKU-1', change: '20%' },
    ]),
  };

  const mockChanges = {
    recordChange: jest.fn().mockResolvedValue(undefined),
    applyPendingChanges: jest.fn().mockResolvedValue(0),
  };
  const decisionEngine = new SupplierDecisionEngine();

  it('monitors supplier and creates approval for large price changes', async () => {
    const useCase = new MonitorSupplierUseCase(
      mockRepo as any,
      mockScraper as any,
      mockDetector as any,
      decisionEngine,
      mockChanges
    );
    const result = await useCase.execute('sup_1', { tenantId: 'tenant_default' });
    expect(result.productsFound).toBe(1);
    expect(result.changes).toHaveLength(1);
    expect(mockRepo.saveProduct).toHaveBeenCalled();
  });

  it('returns empty when scrape finds no products', async () => {
    mockScraper.scrape.mockResolvedValueOnce([]);
    mockDetector.detectChanges.mockReturnValueOnce([]);
    const useCase = new MonitorSupplierUseCase(
      mockRepo as any,
      mockScraper as any,
      mockDetector as any,
      decisionEngine,
      mockChanges
    );
    const result = await useCase.execute('sup_1', { tenantId: 'tenant_default' });
    expect(result.productsFound).toBe(0);
  });
});
