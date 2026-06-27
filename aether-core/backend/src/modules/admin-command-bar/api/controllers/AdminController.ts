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
import { getBrainAgentRunByCommandId, cancelBrainAgentRunByCommandId } from '../../../../ai/intelligence/command-brain/BrainAgentRunStore';
import {
  getTenantApprovalPolicy,
  setTenantApprovalPolicy,
  type TenantApprovalPolicy,
} from '../../../../shared/policy/tenantApprovalPolicyService';
import {
  getMerchantSettings,
  updateMerchantSettings,
  listConnectedServices,
} from '../../../../shared/settings/TenantSettingsService';
import type { MerchantSettings } from '../../../../shared/settings/merchantSettingsTypes';

import {
  buildAutonomyTrace,
  buildExplainabilityTimeline,
} from '../../../../shared/explain/ExplainabilityService';
import { computeUiAdoptionMetrics } from '../../application/services/UiAdoptionMetricsService';
import { prisma } from '../../../../shared/prisma/client';
import {
  buildActivityFeed,
  resolveActivitySince,
} from '../../application/services/ActivityFeedService';
import { buildNotificationInbox } from '../../application/services/NotificationInboxService';
import {
  dismissNotification as persistDismissNotification,
  markAllNotificationsRead as persistMarkAllNotificationsRead,
  markNotificationRead as persistMarkNotificationRead,
} from '../../application/services/NotificationReadStateService';

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

const notificationChannelSchema = z.object({
  inApp: z.boolean().optional(),
  email: z.boolean().optional(),
});

const settingsPatchSchema = z.object({
  autonomyLevel: z.enum(['low', 'medium', 'high']).optional(),
  autoApproveLowRisk: z.boolean().optional(),
  autoApproveMediumRiskMail: z.boolean().optional(),
  maxAutoPriceChangePct: z.number().min(0).max(100).optional(),
  maxMarginImpactEuro: z.number().min(0).max(1_000_000).optional(),
  policyEnabled: z.boolean().optional(),
  autoRunWindow: z.enum(['always', 'outside_office', 'custom']).optional(),
  autoRunWindowStart: z.string().max(5).nullable().optional(),
  autoRunWindowEnd: z.string().max(5).nullable().optional(),
  notificationPrefs: z
    .object({
      autonomousLowRisk: notificationChannelSchema.optional(),
      highRiskApproval: notificationChannelSchema.optional(),
      supplierChanges: notificationChannelSchema.optional(),
      weeklyDigest: notificationChannelSchema.optional(),
      frequency: z.enum(['immediate', 'daily', 'weekly']).optional(),
    })
    .optional(),
  locale: z.enum(['nl', 'en']).optional(),
  dataExportEnabled: z.boolean().optional(),
  brainVectorBackend: z.enum(['pgvector', 'lancedb', 'memory']).nullable().optional(),
  brainKnowledgeTransferEnabled: z.boolean().nullable().optional(),
  brainKnowledgeUpdateProfile: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  brainFederatedContributionEnabled: z.boolean().optional(),
  brainKnowledgeGovernanceMode: z.enum(['contribute_only', 'receive_only', 'full_loop']).optional(),
  brainLoRAPath: z.string().max(500).nullable().optional(),
  brainActionMode: z.enum(['always_confirm', 'confirm_on_uncertain', 'adaptive']).optional(),
  brainAdaptiveLearningEnabled: z.boolean().optional(),
  brainAdaptiveAutoExecuteEnabled: z.boolean().optional(),
  brainCrossTenantAgentPatternsEnabled: z.boolean().optional(),
  brainFederatedExecutionContribute: z.boolean().optional(),
  brainBilateralExchangeEnabled: z.boolean().optional(),
});

const brainToolExecuteSchema = z.object({
  proposalId: z.string().min(1),
  commandId: z.string().optional(),
});

async function buildDashboardPayload(tenantId: string) {
  const { adminData } = getCompositionRoot();
  const [
    products,
    lowMarginProducts,
    unreadEmails,
    pendingApprovals,
    recentCommands,
    uplift,
    emailMetrics,
    autonomy,
    uiMetrics,
    tenant,
  ] = await Promise.all([
    adminData.countProducts(tenantId),
    adminData.countLowMarginProducts(tenantId),
    adminData.countEmailsByStatus(tenantId, ['received', 'escalated']),
    countPendingApprovals(tenantId),
    adminData.countRecentCommands(tenantId),
    computeIncrementalRevenueUplift(tenantId, 30),
    getEmailMetrics(tenantId, 30, emailAnalyticsAdapter),
    getAutonomyMetrics(tenantId, 30),
    computeUiAdoptionMetrics(tenantId),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);

  return {
    status: getDashboardAggregateStatus(),
    tenantDisplayName: tenant?.name ?? undefined,
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
    lowRiskAutonomous24h: uiMetrics.lowRiskAutonomous24h,
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
        const acceptStream = req.headers.accept?.includes('text/event-stream');

        if (acceptStream && process.env.COMMAND_BRAIN_STREAMING_ENABLED === 'true') {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.flushHeaders?.();

          const abortController = new AbortController();
          req.on('close', () => abortController.abort());

          const result = await executeNaturalLanguageCommand.execute(
            command,
            { tenantId: req.tenantId!, actorId: req.actorId },
            {
              onEvent: (event) => {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
              },
              abortSignal: abortController.signal,
            }
          );
          res.write(`data: ${JSON.stringify({ type: 'result', result })}\n\n`);
          res.end();
          return;
        }

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

  resumeAgentRun = [
    requireOperator,
    async (req: Request, res: Response) => {
      try {
        const { resumeBrainAgentRun } = getCompositionRoot();
        if (!resumeBrainAgentRun) {
          res.status(503).json({ error: 'Agent loop not available' });
          return;
        }
        const run = await getBrainAgentRunByCommandId(req.params.commandId, req.tenantId!);
        if (!run) {
          res.status(404).json({ error: 'Agent run not found' });
          return;
        }
        const result = await resumeBrainAgentRun.execute(run.id, req.tenantId!);
        res.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Resume failed';
        res.status(400).json({ error: message });
      }
    },
  ];

  cancelAgentRun = [
    requireOperator,
    async (req: Request, res: Response) => {
      try {
        const { cancelled, agentRunId } = await cancelBrainAgentRunByCommandId(
          req.params.commandId,
          req.tenantId!
        );
        if (!cancelled) {
          res.status(404).json({ error: 'No cancellable agent run found' });
          return;
        }
        res.json({ success: true, agentRunId, status: 'cancelled' });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Cancel failed';
        res.status(400).json({ error: message });
      }
    },
  ];

  getAgentRun = [
    requireViewer,
    async (req: Request, res: Response) => {
      try {
        const { getAgentRun } = getCompositionRoot();
        const result = await getAgentRun.execute(req.params.commandId, req.tenantId!);
        res.json(result);
      } catch {
        res.status(500).json({ error: 'Failed to load agent run' });
      }
    },
  ];

  undoCommand = [
    requireOperator,
    async (req: Request, res: Response) => {
      try {
        const { undoCommandUseCase } = getCompositionRoot();
        const result = await undoCommandUseCase.execute(req.params.commandId, {
          tenantId: req.tenantId!,
          actorId: req.actorId,
        });
        res.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Undo failed';
        res.status(400).json({ error: message });
      }
    },
  ];

  executeBrainTool = [
    requireOperator,
    validateBody(brainToolExecuteSchema),
    async (req: Request, res: Response) => {
      try {
        const { proposalId, commandId } = req.body as { proposalId: string; commandId?: string };
        const { executeBrainTool } = getCompositionRoot();
        const result = await executeBrainTool.execute(proposalId, {
          tenantId: req.tenantId!,
          actorId: req.actorId,
          commandId,
        });
        res.status(result.success ? 200 : 400).json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tool execution failed';
        res.status(500).json({ success: false, error: message });
      }
    },
  ];

  rejectBrainTool = [
    requireOperator,
    validateBody(brainToolExecuteSchema),
    async (req: Request, res: Response) => {
      try {
        const { proposalId } = req.body as { proposalId: string };
        const { executeBrainTool } = getCompositionRoot();
        const result = await executeBrainTool.reject(proposalId, {
          tenantId: req.tenantId!,
          actorId: req.actorId,
        });
        res.json(result);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Reject failed';
        res.status(500).json({ success: false, error: message });
      }
    },
  ];

  getSuggestions = [
    requireViewer,
    async (req: Request, res: Response) => {
      const route = String(req.query.route ?? '/');
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 12;
      const { suggestionService } = getCompositionRoot();
      const payload = await suggestionService.getSuggestions(req.tenantId!, route, limit);
      res.json(payload);
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

  getActivityFeed = [
    requireViewer,
    async (req: Request, res: Response) => {
      const days = req.query.days ? parseInt(String(req.query.days), 10) : undefined;
      const sinceIso = req.query.since ? String(req.query.since) : undefined;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
      const module = req.query.module ? String(req.query.module) : undefined;
      const includeNav = req.query.includeNav === '1';

      const since = resolveActivitySince(days, sinceIso);
      const feed = await buildActivityFeed({
        tenantId: req.tenantId!,
        since,
        limit,
        module,
        includeNav,
      });
      res.json(feed);
    },
  ];

  getNotifications = [
    requireViewer,
    async (req: Request, res: Response) => {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
      const actorId = req.actorId ?? 'api-key-user';
      const inbox = await buildNotificationInbox(req.tenantId!, actorId, limit);
      res.json(inbox);
    },
  ];

  markNotificationRead = [
    requireViewer,
    async (req: Request, res: Response) => {
      const actorId = req.actorId ?? 'api-key-user';
      await persistMarkNotificationRead(req.tenantId!, actorId, req.params.id);
      res.status(204).send();
    },
  ];

  markAllNotificationsRead = [
    requireViewer,
    validateBody(z.object({ ids: z.array(z.string().min(1).max(128)).optional() })),
    async (req: Request, res: Response) => {
      const actorId = req.actorId ?? 'api-key-user';
      const body = req.body as { ids?: string[] };
      const ids =
        body.ids ??
        (await buildNotificationInbox(req.tenantId!, actorId, 50)).notifications.map((n) => n.id);
      if (ids.length > 0) {
        await persistMarkAllNotificationsRead(req.tenantId!, actorId, ids);
      }
      res.status(204).send();
    },
  ];

  dismissNotification = [
    requireViewer,
    async (req: Request, res: Response) => {
      const actorId = req.actorId ?? 'api-key-user';
      await persistDismissNotification(req.tenantId!, actorId, req.params.id);
      res.status(204).send();
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
      const policy = await getTenantApprovalPolicy(req.tenantId!);
      res.json({ status: 'live', policy });
    },
  ];

  updateApprovalPolicy = [
    requireOperator,
    validateBody(policyPatchSchema),
    async (req: Request, res: Response) => {
      const policy = await setTenantApprovalPolicy(req.tenantId!, req.body as Partial<TenantApprovalPolicy>);
      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'admin-command-bar',
        action: 'approval_policy_updated',
        actor: req.actorId,
        details: { ...policy },
      });
      res.json({ success: true, policy });
    },
  ];

  getSettings = [
    requireViewer,
    async (req: Request, res: Response) => {
      const settings = await getMerchantSettings(req.tenantId!);
      res.json({ status: 'live', settings });
    },
  ];

  updateSettings = [
    requireOperator,
    validateBody(settingsPatchSchema),
    async (req: Request, res: Response) => {
      const patch = req.body as Partial<MerchantSettings>;
      const settings = await updateMerchantSettings(req.tenantId!, patch);
      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'admin-command-bar',
        action: 'settings_updated',
        actor: req.actorId,
        details: patch,
      });
      res.json({ success: true, settings });
    },
  ];

  getConnectedServices = [
    requireViewer,
    async (req: Request, res: Response) => {
      const services = await listConnectedServices(req.tenantId!);
      res.json({ status: 'live', services });
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
