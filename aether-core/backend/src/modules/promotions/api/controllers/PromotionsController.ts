import { Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';

const createSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['percent', 'fixed']).optional(),
  value: z.number().nonnegative().optional(),
  code: z.string().min(1).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export class PromotionsController {
  static list = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { listPromotions } = getCompositionRoot();
      const result = await listPromotions.execute(req.tenantId!);
      res.json(result);
    },
  ];

  static create = [
    requireOperator,
    validateBody(createSchema),
    async (req: Request, res: Response) => {
      try {
        const { createPromotion } = getCompositionRoot();
        const { name, type, value, code, startsAt, endsAt } = req.body as z.infer<typeof createSchema>;
        const result = await createPromotion.execute(req.tenantId!, {
          name,
          type,
          value,
          code: code ?? null,
          startsAt: startsAt ? new Date(startsAt) : null,
          endsAt: endsAt ? new Date(endsAt) : null,
        });
        res.status(201).json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create promotion';
        res.status(400).json({ error: { code: 'PROMOTION_CREATE_FAILED', message } });
      }
    },
  ];
}
