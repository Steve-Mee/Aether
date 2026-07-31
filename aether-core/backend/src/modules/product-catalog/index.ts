import { Router } from 'express';
import { ProductController } from './api/controllers/ProductController';

const router = Router();

router.get('/', ...ProductController.getAll);
router.post('/', ...ProductController.create);
router.get('/:id', ...ProductController.getById);
router.patch('/:id', ...ProductController.update);
router.delete('/:id', ...ProductController.remove);
router.get('/:id/variants', ...ProductController.listVariants);
router.post('/:id/variants', ...ProductController.createVariant);
router.patch('/:id/variants/:variantId', ...ProductController.updateVariant);
router.delete('/:id/variants/:variantId', ...ProductController.deleteVariant);
router.post('/:id/media', ...ProductController.uploadMedia);

export default router;
