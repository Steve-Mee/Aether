import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getCompositionRoot } from '../../bootstrap/compositionRoot';
import { PrismaEmailRepository } from './infrastructure/persistence/PrismaEmailRepository';
import { EmailRollbackService } from './application/services/EmailRollbackService';
import { getEmailMetrics } from './application/services/EmailMetricsService';
import { prisma } from '../../shared/prisma/client';
import { mailboxAdapter } from './infrastructure/adapters/PrismaMailboxAdapter';
import { emailContextAdapter } from './infrastructure/adapters/PrismaEmailContextAdapter';
import { emailRollbackAdapter } from './infrastructure/adapters/PrismaEmailRollbackAdapter';
import { emailAnalyticsAdapter } from './infrastructure/adapters/PrismaEmailAnalyticsAdapter';
import { requireOperator, requireViewer } from '../../shared/security/rbac';
import { validateBody } from '../../shared/security/validate';

const emailRepository = new PrismaEmailRepository(prisma);
const emailRollbackService = new EmailRollbackService(emailRollbackAdapter);

const processSchema = z.object({
  from: z.string().email(),
  subject: z.string().optional(),
  body: z.string().optional(),
  messageId: z.string().optional(),
});

const mailboxSchema = z.object({
  email: z.string().email(),
  imapHost: z.string().optional(),
  smtpHost: z.string().optional(),
  credentialsEnc: z.string().optional(),
});

const router = Router();

router.get('/', requireViewer, async (req: Request, res: Response) => {
  const emails = await emailRepository.findAll(req.tenantId!);
  res.json(emails);
});

router.get('/mailboxes', requireViewer, async (req: Request, res: Response) => {
  const mailboxes = await mailboxAdapter.listMailboxes(req.tenantId!);
  res.json(mailboxes);
});

router.post(
  '/mailboxes',
  requireOperator,
  validateBody(mailboxSchema),
  async (req: Request, res: Response) => {
    const mailbox = await mailboxAdapter.createMailbox(req.tenantId!, req.body);
    res.status(201).json(mailbox);
  }
);

router.post(
  '/process',
  requireOperator,
  validateBody(processSchema),
  async (req: Request, res: Response) => {
    try {
      const email = await getCompositionRoot().processIncomingEmailUseCase.execute(req.body, {
        tenantId: req.tenantId!,
        actorId: req.actorId,
      });
      res.status(201).json(email);
    } catch (error) {
      res.status(400).json({ error: 'Failed to process email' });
    }
  }
);

const rollbackParamsSchema = z.object({
  id: z.string().min(1),
});

router.get('/metrics', requireViewer, async (req: Request, res: Response) => {
  const days = parseInt(String(req.query.days ?? '30'), 10);
  const metrics = await getEmailMetrics(req.tenantId!, days, emailAnalyticsAdapter);
  res.json({ status: 'partial', classificationSourceNote: 'heuristic path always escalates', ...metrics });
});

router.get('/:id', requireViewer, async (req: Request, res: Response) => {
  const email = await emailRepository.findById(req.params.id, req.tenantId!);
  if (!email) {
    res.status(404).json({ error: 'Email not found' });
    return;
  }
  res.json(email);
});

router.post(
  '/:id/rollback',
  requireOperator,
  async (req: Request, res: Response) => {
    const parsed = rollbackParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email id' });
      return;
    }
    try {
      await emailRollbackService.rollback(parsed.data.id, req.tenantId!, req.actorId);
      res.json({ success: true });
    } catch {
      res.status(404).json({ error: 'Email not found' });
    }
  }
);

export default router;
