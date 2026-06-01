import { Router } from 'express';
import { ProductController } from './api/controllers/ProductController';

const router = Router();

router.get('/', ...ProductController.getAll);
router.post('/', ...ProductController.create);

export default router;
