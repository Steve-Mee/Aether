import { Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';

const startSchema = z.object({
  customerAgentId: z.string().min(1),
  merchantAgentId: z.string().min(1),
  productId: z.string().min(1),
  initialOffer: z.number().nonnegative(),
});

const respondSchema = z.object({
  offer: z.number().nonnegative(),
  agentId: z.string().min(1),
});

export class AgenticController {
  startNegotiation = [
    requireOperator,
    validateBody(startSchema),
    async (req: Request, res: Response) => {
      try {
        const { startNegotiation } = getCompositionRoot();
        const negotiation = await startNegotiation.execute(req.body, {
          tenantId: req.tenantId!,
          actorId: req.actorId,
        });
        res.json({ ...negotiation, status: 'partial' });
      } catch {
        res.status(500).json({ error: 'Failed to start negotiation' });
      }
    },
  ];

  getNegotiation = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getNegotiation } = getCompositionRoot();
      const negotiation = await getNegotiation.execute(req.params.id, req.tenantId!);
      if (!negotiation) {
        res.status(404).json({ error: 'Negotiation not found' });
        return;
      }
      res.json({ ...negotiation, status: 'partial' });
    },
  ];

  listActive = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { listActiveNegotiations } = getCompositionRoot();
      const negotiations = await listActiveNegotiations.execute(req.tenantId!);
      res.json({ status: 'partial', negotiations });
    },
  ];

  getActiveNegotiations = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { listActiveNegotiations } = getCompositionRoot();
      const negotiations = await listActiveNegotiations.execute(req.tenantId!);
      res.json({ status: 'partial', negotiations });
    },
  ];

  getNegotiationMetrics = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { listActiveNegotiations } = getCompositionRoot();
      const negotiations = await listActiveNegotiations.execute(req.tenantId!);
      res.json({
        status: 'partial',
        activeCount: negotiations.length,
        tenantId: req.tenantId,
      });
    },
  ];

  respondToOffer = [
    requireOperator,
    validateBody(respondSchema),
    async (req: Request, res: Response) => {
      try {
        const { respondToOffer } = getCompositionRoot();
        const result = await respondToOffer.execute(req.params.id, req.body, {
          tenantId: req.tenantId!,
        });
        res.json({ ...result, status: 'partial' });
      } catch {
        res.status(400).json({ error: 'Failed to respond to offer' });
      }
    },
  ];
}
