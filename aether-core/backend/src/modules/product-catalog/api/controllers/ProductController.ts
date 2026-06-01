import { Request, Response } from 'express';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { z } from 'zod';
import { validateBody } from '../../../../shared/security/validate';

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  slug: z.string().min(1),
  price: z.number().optional(),
  stock: z.number().optional(),
});

export class ProductController {
  static getAll = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { listProducts } = getCompositionRoot();
      const products = await listProducts.execute(req.tenantId!);
      res.json(products);
    },
  ];

  static create = [
    requireOperator,
    validateBody(createSchema),
    async (req: Request, res: Response) => {
      try {
        const { createProduct } = getCompositionRoot();
        const product = await createProduct.execute(req.tenantId!, req.body);
        res.status(201).json(product);
      } catch {
        res.status(400).json({ error: 'Failed to create product' });
      }
    },
  ];
}
