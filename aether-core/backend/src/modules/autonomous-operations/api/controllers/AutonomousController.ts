import { Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';

const decisionSchema = z.object({
  type: z.string().min(1).default('manual'),
  result: z.string().min(1).default('pending'),
  rationale: z.string().optional(),
});

export class AutonomousController {
  getAllDecisions = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { listDecisions } = getCompositionRoot();
      const decisions = await listDecisions.execute(req.tenantId!);
      res.json(decisions);
    },
  ];

  triggerDecision = [
    requireOperator,
    validateBody(decisionSchema),
    async (req: Request, res: Response) => {
      const { type, result, rationale } = req.body;
      const { createDecision } = getCompositionRoot();
      const decision = await createDecision.execute(
        { type, result, rationale },
        { tenantId: req.tenantId!, actorId: req.actorId }
      );
      res.status(201).json(decision);
    },
  ];

  getDecisionById = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getDecision } = getCompositionRoot();
      const decision = await getDecision.execute(req.params.id, req.tenantId!);
      if (!decision) {
        res.status(404).json({ error: 'Decision not found' });
        return;
      }
      res.json(decision);
    },
  ];
}
