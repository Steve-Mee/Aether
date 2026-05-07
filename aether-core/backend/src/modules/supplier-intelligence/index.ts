import { Router } from 'express';
import { SupplierController } from './api/controllers/SupplierController';

const router = Router();

router.get('/', SupplierController.getAll);
router.post('/', SupplierController.create);
router.post('/:id/monitor', SupplierController.monitor);

export default router;