import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { verifyWebhookSecret } from '../../../../shared/security/auth';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { resolveSupplierWebhookTenant } from '../../../../shared/security/webhookTenantResolver';

const createSchema = z.object({
  name: z.string().min(1),
  website: z.string().url(),
});

const webhookSchema = z.object({
  supplierId: z.string().optional(),
  products: z.array(
    z.object({
      sku: z.string(),
      name: z.string(),
      price: z.number(),
      stock: z.number().optional(),
    })
  ),
});

export class SupplierController {
  static async getAll(req: Request, res: Response) {
    const { supplierRepository } = getCompositionRoot();
    const suppliers = await supplierRepository.findAll(req.tenantId!);
    res.json(suppliers);
  }

  static async monitor(req: Request, res: Response) {
    try {
      const { monitorSupplierUseCase } = getCompositionRoot();
      const result = await monitorSupplierUseCase.execute(req.params.id, {
        tenantId: req.tenantId!,
        actorId: req.actorId,
      });
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  }

  static create = [
    requireOperator,
    validateBody(createSchema),
    async (req: Request, res: Response) => {
      try {
        const { supplierRepository } = getCompositionRoot();
        const supplier = await supplierRepository.create({
          name: req.body.name,
          website: req.body.website,
          tenantId: req.tenantId!,
        });
        res.status(201).json(supplier);
      } catch {
        res.status(400).json({ error: 'Failed to create supplier' });
      }
    },
  ];

  static requireSupplierWebhookSecret(req: Request, res: Response, next: NextFunction): void {
    if (!verifyWebhookSecret(req.header('X-Webhook-Secret'), 'SUPPLIER_WEBHOOK_SECRET')) {
      res.status(403).json({ error: 'Invalid or missing supplier webhook secret' });
      return;
    }
    next();
  }

  static webhook = [
    SupplierController.requireSupplierWebhookSecret,
    resolveSupplierWebhookTenant,
    validateBody(webhookSchema),
    async (req: Request, res: Response) => {
      const { supplierId, products } = req.body;
      const { supplierWebhook } = getCompositionRoot();
      const result = await supplierWebhook.handleWebhook(req.tenantId!, supplierId, products);

      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'supplier-intelligence',
        action: 'webhook_received',
        actor: req.actorId,
        details: { supplierId, productCount: products.length },
      });

      res.json({ success: true, eventId: result.eventId, productsReceived: result.productsReceived });
    },
  ];
}
