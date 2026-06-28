import { Router, Request, Response } from 'express';
import { requireOperator } from '../../../shared/security/rbac';
import { getCompositionRoot } from '../../../bootstrap/compositionRoot';

const router = Router();

router.get('/audit', requireOperator, async (req: Request, res: Response) => {
  const contractId = typeof req.query.contractId === 'string' ? req.query.contractId : undefined;
  const audit = await getCompositionRoot().bilateralExchangeService.listAudit(contractId);
  res.json({ audit });
});

export default router;
