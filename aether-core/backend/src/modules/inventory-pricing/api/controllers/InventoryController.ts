import { Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';

const stockSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int(),
});

const priceSchema = z.object({
  productId: z.string().min(1),
  basePrice: z.number().nonnegative(),
  reason: z.string().optional(),
});

export class InventoryController {
  updateStock = [
    requireOperator,
    validateBody(stockSchema),
    async (req: Request, res: Response) => {
      const { productId, warehouseId, quantity } = req.body;
      const { updateInventory } = getCompositionRoot();
      await updateInventory.execute(req.tenantId!, productId, warehouseId, quantity);
      res.json({ status: 'experimental', success: true, message: 'Inventory updated' });
    },
  ];

  applyDynamicPrice = [
    requireOperator,
    validateBody(priceSchema),
    async (req: Request, res: Response) => {
      const { productId, basePrice, reason } = req.body;
      const { applyDynamicPrice } = getCompositionRoot();
      const newPrice = await applyDynamicPrice.execute(req.tenantId!, productId, basePrice, reason);
      res.json({ status: 'experimental', success: true, newPrice });
    },
  ];

  getLowStock = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { adminData } = getCompositionRoot();
      const items = await adminData.listLowStockInventory(req.tenantId!);
      res.json({ status: 'experimental', lowStockProducts: items });
    },
  ];
}
