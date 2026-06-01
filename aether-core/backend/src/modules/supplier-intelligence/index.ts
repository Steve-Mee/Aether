import { Router, Request, Response } from 'express';
import { SupplierController } from './api/controllers/SupplierController';
import { requireOperator, requireViewer } from '../../shared/security/rbac';
import { prisma } from '../../shared/prisma/client';

const router = Router();

router.get('/changes', requireViewer, async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const status = String(req.query.status ?? 'pending');
  const changes = await prisma.supplierChange.findMany({
    where: { tenantId, status },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json(
    changes.map((c) => ({
      ...c,
      payload: JSON.parse(c.payload),
    }))
  );
});

router.get('/', requireViewer, SupplierController.getAll);
router.post('/', ...SupplierController.create);
router.post('/webhook', ...SupplierController.webhook);
router.post('/:id/monitor', requireOperator, SupplierController.monitor);

export default router;
