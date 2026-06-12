import { Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import { writeAuditLog } from '../../../../shared/audit/auditService';

const patchSchema = z.object({
  autoSyncEnabled: z.boolean().optional(),
  status: z.enum(['active', 'inactive', 'disabled']).optional(),
  supplierType: z.string().nullable().optional(),
});

export class SupplierOverviewController {
  static async overview(req: Request, res: Response) {
    const { supplierOverviewService } = getCompositionRoot();
    const result = await supplierOverviewService.getOverview(req.tenantId!);
    res.json(result);
  }

  static async detail(req: Request, res: Response) {
    const { supplierOverviewService } = getCompositionRoot();
    const result = await supplierOverviewService.getDetail(req.tenantId!, req.params.id);
    if (!result) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }
    res.json(result);
  }

  static async syncHistory(req: Request, res: Response) {
    const { supplierOverviewService } = getCompositionRoot();
    const supplier = await getCompositionRoot().supplierRepository.findById(
      req.params.id,
      req.tenantId!
    );
    if (!supplier) {
      res.status(404).json({ error: 'Supplier not found' });
      return;
    }
    const items = await supplierOverviewService.getSyncHistory(
      req.tenantId!,
      req.params.id,
      5
    );
    res.json({ items });
  }

  static patch = [
    requireOperator,
    validateBody(patchSchema),
    async (req: Request, res: Response) => {
      const { supplierRepository } = getCompositionRoot();
      const updated = await supplierRepository.update(req.params.id, req.tenantId!, {
        autoSyncEnabled: req.body.autoSyncEnabled,
        status: req.body.status,
        supplierType: req.body.supplierType,
      });
      if (!updated) {
        res.status(404).json({ error: 'Supplier not found' });
        return;
      }

      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'supplier-intelligence',
        action: 'supplier.settings_updated',
        actor: req.actorId,
        details: {
          supplierId: updated.id,
          autoSyncEnabled: updated.autoSyncEnabled,
          status: updated.status,
        },
      });

      res.json({
        id: updated.id,
        name: updated.name,
        website: updated.website,
        supplierType: updated.supplierType,
        status: updated.status,
        autoSyncEnabled: updated.autoSyncEnabled,
        createdAt: updated.createdAt.toISOString(),
      });
    },
  ];
}
