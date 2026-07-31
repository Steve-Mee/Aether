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

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  slug: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
  stock: z.number().int().optional(),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
});

const variantCreateSchema = z.object({
  sku: z.string().min(1),
  price: z.number().nonnegative(),
  currency: z.string().optional(),
  stock: z.number().int().optional(),
});

const variantUpdateSchema = z.object({
  sku: z.string().min(1).optional(),
  price: z.number().nonnegative().optional(),
  currency: z.string().optional(),
  stock: z.number().int().optional(),
});

const mediaSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  contentBase64: z.string().min(1),
  alt: z.string().optional(),
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

  static getById = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getProduct } = getCompositionRoot();
      const product = await getProduct.execute(req.tenantId!, req.params.id);
      if (!product) {
        res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
        return;
      }
      res.json(product);
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
        res.status(400).json({ error: { code: 'PRODUCT_CREATE_FAILED', message: 'Failed to create product' } });
      }
    },
  ];

  static update = [
    requireOperator,
    validateBody(updateSchema),
    async (req: Request, res: Response) => {
      const { updateProduct } = getCompositionRoot();
      const product = await updateProduct.execute(req.tenantId!, req.params.id, req.body);
      if (!product) {
        res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
        return;
      }
      res.json(product);
    },
  ];

  static remove = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { deleteProduct } = getCompositionRoot();
      const deleted = await deleteProduct.execute(req.tenantId!, req.params.id);
      if (!deleted) {
        res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
        return;
      }
      res.status(204).send();
    },
  ];

  static listVariants = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { listProductVariants } = getCompositionRoot();
      const variants = await listProductVariants.execute(req.tenantId!, req.params.id);
      if (variants === null) {
        res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
        return;
      }
      res.json({ variants });
    },
  ];

  static createVariant = [
    requireOperator,
    validateBody(variantCreateSchema),
    async (req: Request, res: Response) => {
      const { createProductVariant } = getCompositionRoot();
      const variant = await createProductVariant.execute(req.tenantId!, req.params.id, req.body);
      if (!variant) {
        res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
        return;
      }
      res.status(201).json(variant);
    },
  ];

  static updateVariant = [
    requireOperator,
    validateBody(variantUpdateSchema),
    async (req: Request, res: Response) => {
      const { updateProductVariant } = getCompositionRoot();
      const variant = await updateProductVariant.execute(
        req.tenantId!,
        req.params.id,
        req.params.variantId,
        req.body
      );
      if (!variant) {
        res.status(404).json({ error: { code: 'VARIANT_NOT_FOUND', message: 'Variant not found' } });
        return;
      }
      res.json(variant);
    },
  ];

  static deleteVariant = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { deleteProductVariant } = getCompositionRoot();
      const deleted = await deleteProductVariant.execute(
        req.tenantId!,
        req.params.id,
        req.params.variantId
      );
      if (!deleted) {
        res.status(404).json({ error: { code: 'VARIANT_NOT_FOUND', message: 'Variant not found' } });
        return;
      }
      res.status(204).send();
    },
  ];

  static uploadMedia = [
    requireOperator,
    validateBody(mediaSchema),
    async (req: Request, res: Response) => {
      try {
        const { uploadProductMedia } = getCompositionRoot();
        const product = await uploadProductMedia.execute(req.tenantId!, req.params.id, req.body);
        if (!product) {
          res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
          return;
        }
        res.status(201).json({ product });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Media upload failed';
        res.status(400).json({ error: { code: 'MEDIA_UPLOAD_FAILED', message } });
      }
    },
  ];
}
