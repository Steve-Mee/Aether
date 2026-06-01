import { Router, Request, Response } from 'express';
import {
  getOutcomes,
  getExplainabilityReport,
  recordOutcome,
} from '../../ai/attribution/OutcomeEngine';
import { verifyOutcomeWithEvidence } from '../../shared/outcomes/OutcomeVerificationService';
import { requireOperator, requireViewer } from '../../shared/security/rbac';
import { z } from 'zod';
import { validateBody } from '../../shared/security/validate';
import { getBillingSummary, reconcileBillingRecords } from '../../shared/billing/billingService';

const router = Router();

const verifySchema = z.object({
  recordId: z.string(),
  status: z.enum(['proposed', 'verified', 'billable']),
  evidence: z
    .object({
      method: z.enum(['causal_uplift', 'holdout_experiment', 'manual_review']),
      confidence: z.number().min(0).max(1),
      notes: z.string().optional(),
    })
    .optional(),
});

const recordSchema = z.object({
  metric: z.string().min(1),
  observed: z.number(),
  confidence: z.number().min(0).max(1).optional(),
});

router.get('/', requireViewer, async (req: Request, res: Response) => {
  const outcomes = await getOutcomes(req.tenantId!);
  res.json({ outcomes });
});

router.get('/report', requireViewer, async (req: Request, res: Response) => {
  const days = parseInt(String(req.query.days ?? '30'), 10);
  const report = await getExplainabilityReport(req.tenantId!, days);
  res.json(report);
});

router.get('/billing', requireViewer, async (req: Request, res: Response) => {
  const days = parseInt(String(req.query.days ?? '30'), 10);
  const summary = await getBillingSummary(req.tenantId!, days);
  res.json({ status: 'partial', ...summary });
});

router.post('/billing/reconcile', requireOperator, async (req: Request, res: Response) => {
  const result = await reconcileBillingRecords(req.tenantId!);
  res.json({ status: 'partial', ...result });
});

router.post('/verify', requireOperator, validateBody(verifySchema), async (req: Request, res: Response) => {
  const { recordId, status, evidence } = req.body;
  if (status === 'proposed') {
    return res.status(400).json({ error: 'Cannot set status to proposed via verify endpoint' });
  }
  const result = await verifyOutcomeWithEvidence(recordId, req.tenantId!, status, {
    method: evidence?.method ?? 'causal_uplift',
    confidence: evidence?.confidence ?? 0.7,
    notes: evidence?.notes,
    actorId: req.actorId,
  });
  if (!result.success) {
    return res.status(422).json({ error: result.reason });
  }
  res.json({ success: true });
});

router.post('/record', requireOperator, validateBody(recordSchema), async (req: Request, res: Response) => {
  const { metric, observed, confidence } = req.body;
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 30 * 86400000);
  const result = await recordOutcome({
    tenantId: req.tenantId!,
    metric,
    observed,
    confidence: confidence ?? 0.8,
    periodStart,
    periodEnd,
    verificationStatus: 'proposed',
  });
  res.status(201).json(result);
});

export default router;
