import { SupplierRepository } from '../../domain/repositories/SupplierRepository';
import { SupplierProduct } from '../../domain/entities/SupplierProduct';
import { WebScraperService } from '../services/WebScraperService';
import { PriceChangeDetectorService } from '../services/PriceChangeDetectorService';
import { createApproval } from '../../../../shared/approval/approvalService';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { eventBus } from '../../../../shared/events/eventBus';
import { orchestrator } from '../../../../ai/orchestrator/Orchestrator';
import { SupplierDecisionEngine } from '../services/SupplierDecisionEngine';
import type { SupplierChangePort } from '../ports/SupplierChangePort';
import { merchantAutonomyKernel } from '../../../../ai/autonomy/DecisionContract';

export class MonitorSupplierUseCase {
  constructor(
    private supplierRepository: SupplierRepository,
    private scraper: WebScraperService,
    private detector: PriceChangeDetectorService,
    private decisionEngine: SupplierDecisionEngine,
    private supplierChanges: SupplierChangePort
  ) {}

  async execute(supplierId: string, ctx: { tenantId: string; actorId?: string }): Promise<any> {
    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'supplier-intelligence',
      action: 'autonomy_observe',
      actor: ctx.actorId,
      details: { supplierId },
    });

    const supplier = await this.supplierRepository.findById(supplierId, ctx.tenantId);
    if (!supplier) throw new Error('Supplier not found');

    const scrapedProducts = await this.scraper.scrape(supplier.website, { tenantId: ctx.tenantId });
    const existingProducts = await this.supplierRepository.findProductsBySupplier(supplierId);
    const changes = this.detector.detectChanges(existingProducts, scrapedProducts);

    for (const product of scrapedProducts) {
      const withSupplier = new SupplierProduct(
        product.id,
        supplierId,
        product.name,
        product.sku,
        product.currentPrice,
        product.currency,
        product.stockLevel,
        product.lastChecked
      );
      await this.supplierRepository.saveProduct(withSupplier);
    }

    for (const change of changes) {
      const changePct =
        change.type === 'price_change'
          ? Math.abs(parseFloat(String(change.change).replace('%', '')))
          : 0;
      const decision = this.decisionEngine.decide({
        changeType: change.type === 'new_product' ? 'new_product' : 'price_change',
        changePercent: changePct,
      });
      const autonomy = merchantAutonomyKernel.evaluate({
        tenantId: ctx.tenantId,
        module: 'supplier-intelligence',
        action: `supplier.${decision.action}`,
        context: { changeType: change.type, changePercent: changePct },
        actorId: ctx.actorId,
      });
      await merchantAutonomyKernel.recordDecision(
        {
          tenantId: ctx.tenantId,
          module: 'supplier-intelligence',
          action: `supplier.${decision.action}`,
          context: { supplierId, changeType: change.type },
          actorId: ctx.actorId,
        },
        autonomy
      );
      const needsApproval = decision.requiresApproval || autonomy.action === 'approval_required';

      await writeAuditLog({
        tenantId: ctx.tenantId,
        module: 'supplier-intelligence',
        action: 'autonomy_decide',
        actor: ctx.actorId,
        details: { supplierId, changeType: change.type, needsApproval, decision: decision.action },
      });

      await this.supplierChanges.recordChange({
        tenantId: ctx.tenantId,
        supplierId,
        changeType: change.type,
        payload: JSON.stringify({ ...change, decision: decision.action, reason: decision.reason }),
        status: needsApproval ? 'pending' : 'auto_applied',
      });

      if (needsApproval) {
        await writeAuditLog({
          tenantId: ctx.tenantId,
          module: 'supplier-intelligence',
          action: 'autonomy_approve',
          actor: ctx.actorId,
          details: { supplierId, changeType: change.type },
        });
        await createApproval({
          tenantId: ctx.tenantId,
          module: 'supplier-intelligence',
          actionType: change.type,
          payload: { supplierId, ...change, decision: decision.action },
          requestedBy: ctx.actorId,
        });
      } else {
        await eventBus.publish({
          tenantId: ctx.tenantId,
          type: 'supplier.price_changed',
          payload: { supplierId, change, decision: decision.action },
        });
      }
    }

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'supplier-intelligence',
      action: 'autonomy_measure',
      actor: ctx.actorId,
      details: { supplierId, changeCount: changes.length, productsFound: scrapedProducts.length },
    });

    await orchestrator.execute({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      task: 'supplier.sync',
      input: { supplierId, productsFound: scrapedProducts.length },
    });

    return {
      supplier: supplier.name,
      productsFound: scrapedProducts.length,
      changes,
    };
  }
}
