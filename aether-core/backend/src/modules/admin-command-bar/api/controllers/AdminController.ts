import { getAutonomyMetrics } from '../../../../shared/autonomy/AutonomyMetricsService';
import { getEmailMetrics } from '../../../aether-mail/application/services/EmailMetricsService';
import { emailAnalyticsAdapter } from '../../../aether-mail/infrastructure/adapters/PrismaEmailAnalyticsAdapter';
import { countPendingApprovals } from '../../../../shared/approval/approvalService';
import { computeIncrementalRevenueUplift } from '../../../../ai/attribution/OutcomeEngine';
import { workflowEngine } from '../../../../ai/orchestrator/WorkflowEngine';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import {
  getDashboardAggregateStatus,
  loadFeatureStatusDocument,
} from '../../../../shared/truth/featureStatusRegistry';
import { getOperatingMetrics } from '../../../../shared/truth/operatingMetricsService';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { z } from 'zod';
import { Request, Response } from 'express';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import {
  getTenantApprovalPolicy,
  setTenantApprovalPolicy,
  type TenantApprovalPolicy,
} from '../../../../shared/policy/tenantApprovalPolicyService';

import {
  buildAutonomyTrace,
  buildExplainabilityTimeline,
} from '../../../../shared/explain/ExplainabilityService';
import { computeUiAdoptionMetrics } from '../../application/services/UiAdoptionMetricsService';

const commandSchema = z.object({
  command: z.string().min(1).max(2000),
});

const uiEventSchema = z.object({
  type: z.enum(['navigation']),
  path: z.string().min(1).max(500),
});

const policyPatchSchema = z.object({
  autoApproveLowRisk: z.boolean().optional(),
  autoApproveMediumRiskMail: z.boolean().optional(),
  maxAutoPriceChangePct: z.number().min(0).max(100).optional(),
  enabled: z.boolean().optional(),
});

async function buildDashboardPayload(tenantId: string) {
  const { adminData } = getCompositionRoot();
  const [products, lowMarginProducts, unreadEmails, pendingApprovals, recentCommands, uplift, emailMetrics, autonomy, uiMetrics] =
    await Promise.all([
      adminData.countProducts(tenantId),
      adminData.countLowMarginProducts(tenantId),
      adminData.countEmailsByStatus(tenantId, ['received', 'escalated']),
      countPendingApprovals(tenantId),
      adminData.countRecentCommands(tenantId),
      computeIncrementalRevenueUplift(tenantId, 30),
      getEmailMetrics(tenantId, 30, emailAnalyticsAdapter),
      getAutonomyMetrics(tenantId, 30),
      computeUiAdoptionMetrics(tenantId),
    ]);

  return {
    status: getDashboardAggregateStatus(),
    productCount: products,
    lowMarginProducts,
    unreadEmails,
    pendingApprovals,
    recentCommands,
    revenueUplift30d: uplift,
    upliftNote: 'Verified and billable outcomes only',
    emailMetrics,
    autonomyRate: autonomy.autonomyRate,
    autonomyTargetMet: autonomy.targetMet,
    timeSavedMinutes7d: uiMetrics.timeSavedMinutes7d,
    nlActionShare7d: uiMetrics.nlActionShare7d,
    autonomousActions7d: uiMetrics.autonomousActions7d,
    commands7d: uiMetrics.commands7d,
    manualNavEvents7d: uiMetrics.manualNavEvents7d,
    timestamp: new Date().toISOString(),
  };
}

export class AdminController {
  executeCommand = [
    requireOperator,
    validateBody(commandSchema),
    async (req: Request, res: Response) => {
      try {
        const { command } = req.body as { command: string };
        const { executeNaturalLanguageCommand } = getCompositionRoot();
        const result = await executeNaturalLanguageCommand.execute(command, {
          tenantId: req.tenantId!,
          actorId: req.actorId,
        });
        res.json(result);
      } catch {
        res.status(500).json({ error: 'Failed to execute command' });
      }
    },
  ];

  getDashboardSummary = [
    requireViewer,
    async (req: Request, res: Response) => {
      res.json(await buildDashboardPayload(req.tenantId!));
    },
  ];

  recordUiEvent = [
    requireViewer,
    validateBody(uiEventSchema),
    async (req: Request, res: Response) => {
      const body = req.body as { type: 'navigation'; path: string };
      if (body.type === 'navigation') {
        await writeAuditLog({
          tenantId: req.tenantId!,
          module: 'admin-command-bar',
          action: 'ui.navigation',
          actor: req.actorId,
          details: { path: body.path },
        });
      }
      res.json({ success: true });
    },
  ];

  getCommandHistory = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { commandLog } = getCompositionRoot();
      const commands = await commandLog.findRecent(req.tenantId!);
      res.json({ commands });
    },
  ];

  getWorkflowTrace = [
    requireViewer,
    async (req: Request, res: Response) => {
      const trace = await workflowEngine.getRunTrace(req.params.runId, req.tenantId!);
      if (!trace) return res.status(404).json({ error: 'Workflow run not found' });
      res.json(trace);
    },
  ];

  getAutonomyMetrics = [
    requireViewer,
    async (req: Request, res: Response) => {
      const days = parseInt(String(req.query.days ?? '30'), 10);
      const metrics = await getAutonomyMetrics(req.tenantId!, days);
      res.json({ status: 'partial', ...metrics });
    },
  ];

  getTruthStatus = [
    requireViewer,
    async (_req: Request, res: Response) => {
      const doc = loadFeatureStatusDocument();
      res.json(doc);
    },
  ];

  getOperatingMetrics = [
    requireViewer,
    async (req: Request, res: Response) => {
      const metrics = await getOperatingMetrics(req.tenantId!);
      res.json({ status: 'live', ...metrics });
    },
  ];

  getExplainability = [
    requireViewer,
    async (req: Request, res: Response) => {
      const entityType = String(req.query.entityType ?? 'email') as 'email' | 'approval';
      const entityId = String(req.query.entityId ?? '');
      if (!entityId) {
        res.status(400).json({ error: 'entityId query required' });
        return;
      }
      try {
        const timeline = await buildExplainabilityTimeline({
          tenantId: req.tenantId!,
          entityType,
          entityId,
        });
        res.json(timeline);
      } catch {
        res.status(404).json({ error: 'Entity not found' });
      }
    },
  ];

  getAutonomyTrace = [
    requireViewer,
    async (req: Request, res: Response) => {
      const module = req.query.module ? String(req.query.module) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
      const trace = await buildAutonomyTrace({
        tenantId: req.tenantId!,
        module,
        limit,
      });
      res.json(trace);
    },
  ];

  completeTruthReview = [
    requireOperator,
    async (req: Request, res: Response) => {
      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'admin-command-bar',
        action: 'truth_review_completed',
        actor: req.actorId,
        details: { reviewedAt: new Date().toISOString() },
      });
      res.json({ success: true, message: 'Truth review recorded' });
    },
  ];

  getApprovalPolicy = [
    requireViewer,
    async (req: Request, res: Response) => {
      const policy = getTenantApprovalPolicy(req.tenantId!);
      res.json({ status: 'live', policy });
    },
  ];

  updateApprovalPolicy = [
    requireOperator,
    validateBody(policyPatchSchema),
    async (req: Request, res: Response) => {
      const policy = setTenantApprovalPolicy(req.tenantId!, req.body as Partial<TenantApprovalPolicy>);
      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'admin-command-bar',
        action: 'approval_policy_updated',
        actor: req.actorId,
        details: policy,
      });
      res.json({ success: true, policy });
    },
  ];

  streamEvents = [
    requireViewer,
    async (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const tenantId = req.tenantId!;
      let closed = false;

      const push = async () => {
        if (closed) return;
        try {
          const payload = await buildDashboardPayload(tenantId);
          res.write(`data: ${JSON.stringify(payload)}\n\n`);
        } catch {
          if (!closed) res.write(`event: error\ndata: {"message":"stream tick failed"}\n\n`);
        }
      };

      await push();
      const interval = setInterval(push, 5000);

      req.on('close', () => {
        closed = true;
        clearInterval(interval);
      });
    },
  ];
}
