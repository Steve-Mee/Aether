import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../shared/prisma/client';
import { requireOperator, requireViewer } from '../../shared/security/rbac';
import { resolveApproval } from '../../shared/approval/approvalService';
import { validateBody } from '../../shared/security/validate';
import { withServerSpan } from '../../shared/observability/sentry';

import {
  assessApprovalAutoEligible,
} from '../../shared/policy/tenantApprovalPolicyService';

const resolveSchema = z.object({
  approve: z.boolean(),
});

const router = Router();

router.get('/', requireViewer, async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const pending = await prisma.approval.findMany({
    where: { tenantId, status: 'pending' },
    orderBy: { createdAt: 'desc' },
  });
  res.json(pending.map((a) => ({ ...a, payload: JSON.parse(a.payload) })));
});

router.post('/auto-apply', requireOperator, async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const pending = await prisma.approval.findMany({
    where: { tenantId, status: 'pending' },
    orderBy: { createdAt: 'asc' },
  });

  let applied = 0;
  const skipped: string[] = [];

  for (const approval of pending) {
    const payload = JSON.parse(approval.payload) as Record<string, unknown>;
    const assessment = await assessApprovalAutoEligible({
      tenantId,
      module: approval.module,
      actionType: approval.actionType,
      payload,
    });

    if (assessment.eligible) {
      await resolveApproval({
        id: approval.id,
        tenantId,
        approve: true,
        resolvedBy: req.actorId ?? 'policy-auto',
      });
      applied++;
    } else {
      skipped.push(approval.id);
    }
  }

  res.json({ applied, skipped: skipped.length, skippedIds: skipped });
});

router.post(
  '/:id/resolve',
  requireOperator,
  validateBody(resolveSchema),
  async (req: Request, res: Response) => {
    const { approve } = req.body;
    await withServerSpan(
      'approval.resolve',
      {
        tenantId: req.tenantId!,
        approvalId: req.params.id,
        approve,
      },
      () =>
        resolveApproval({
          id: req.params.id,
          tenantId: req.tenantId!,
          approve,
          resolvedBy: req.actorId ?? 'unknown',
        })
    );
    res.json({ success: true });
  }
);

export default router;
