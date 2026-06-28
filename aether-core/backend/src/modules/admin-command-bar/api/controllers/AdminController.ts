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
import { assessAutonomyWithTraceForTenant } from '../../../../shared/policy/AutonomyPolicyService';

const APPROVAL_POLICY_SUNSET = '2026-12-31';

const autonomySimulateSchema = z.object({
  module: z.string().min(1).max(100),
  actionType: z.string().min(1).max(200),
  tool: z.string().max(100).optional(),
  intent: z.string().max(100).optional(),
  agentKey: z.string().max(50).optional(),
  payload: z.record(z.unknown()).optional(),
  simulateAt: z.string().datetime().optional(),
  riskClass: z.enum(['low', 'medium', 'high']).optional(),
});

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
import { proactiveSuggestionEmitter } from '../../../../ai/intelligence/proactive/ProactiveSuggestionEmitter';
import { isProactiveSseEnabled } from '../../../../ai/intelligence/proactive/proactiveConfig';
import { buildAgentMetrics } from '../../application/services/AgentMetricsService';
import { buildOverviewFeed, decodeOverviewCursor, listOverviewFeedEventsSince } from '../../application/services/OverviewFeedService';
import { listRecentHandoffs } from '../../application/services/HandoffOverviewService';
import {
  overviewFeedEmitter,
  isOverviewSseEnabled,
} from '../../application/services/OverviewFeedEmitter';
import {
  notificationEmitter,
  isNotificationSseEnabled,
} from '../../application/services/notifications/NotificationEmitter';
import { getWebPushPublicKey } from '../../../../shared/notifications/WebPushNotificationDispatcher';
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

const categoryScheduleSchema = z.object({
  mode: z.enum(['continuous', 'custom']).optional(),
  windowStart: z.string().max(5).nullable().optional(),
  windowEnd: z.string().max(5).nullable().optional(),
  useOutsideOfficePreset: z.boolean().optional(),
});

const categoryPolicyPatchSchema = z.object({
  enabled: z.boolean().optional(),
  allowLowRiskAutoExecute: z.boolean().optional(),
  allowMediumRiskAutoExecute: z.boolean().optional(),
  schedule: categoryScheduleSchema.optional(),
});

const agentOverridePatchSchema = z.object({
  enabled: z.boolean().optional(),
  priority: z.number().min(1).max(10).optional(),
  allowLowRiskAutoExecute: z.boolean().nullable().optional(),
  allowMediumRiskAutoExecute: z.boolean().nullable().optional(),
});

const ruleConditionSchema = z.object({
  field: z.enum([
    'marginImpactEuro',
    'priceChangePct',
    'category',
    'riskClass',
    'agentKey',
    'dayOfWeek',
  ]),
  operator: z.enum(['gt', 'gte', 'lt', 'lte', 'eq', 'in']),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
});

const customRulePatchSchema = z.object({
  id: z.string().min(1).max(64),
  enabled: z.boolean().optional(),
  name: z.string().min(1).max(100),
  sortOrder: z.number().min(0).max(100).optional(),
  conditions: z.array(ruleConditionSchema).max(8),
  outcome: z.enum(['allow_auto', 'require_approval', 'block']),
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
      proactiveSuggestions: notificationChannelSchema.optional(),
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
  proactivePrefs: z
    .object({
      enabled: z.boolean().optional(),
      visibility: z.enum(['off', 'low_risk_only', 'all']).optional(),
      maxActive: z.number().min(1).max(20).optional(),
      snoozeDefaultHours: z.number().min(1).max(168).optional(),
      allowAutoExecute: z.boolean().optional(),
      categories: z
        .object({
          prijs: z.boolean().optional(),
          leverancier: z.boolean().optional(),
          voorraad: z.boolean().optional(),
          algemeen: z.boolean().optional(),
        })
        .optional(),
    })
    .optional(),
  explainabilityPrefs: z
    .object({
      detailLevel: z.enum(['off', 'simple', 'extended']).optional(),
      useLlmSummary: z.boolean().optional(),
      showLiveExplain: z.boolean().optional(),
      showSimilarActions: z.boolean().optional(),
      showCrossTenantSimilarActions: z.boolean().optional(),
    })
    .optional(),
  brainExplainabilityFederateEnabled: z.boolean().optional(),
  goalPrefs: z
    .object({
      enabled: z.boolean().optional(),
      maxActive: z.number().min(1).max(20).optional(),
      defaultPursuitMode: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
      allowGoalLinkedAutoExecute: z.boolean().optional(),
      showOnCommandCenter: z.boolean().optional(),
      conflictResolution: z.enum(['manual', 'auto_deprioritize', 'auto_pause_lower']).optional(),
      allowFederatedContribution: z.boolean().optional(),
      showGlobalHints: z.boolean().optional(),
    })
    .optional(),
  autonomyPrefs: z
    .object({
      preset: z.enum(['conservative', 'balanced', 'aggressive', 'custom']).optional(),
      actionCategories: z
        .object({
          pricing: categoryPolicyPatchSchema.optional(),
          supplier: categoryPolicyPatchSchema.optional(),
          inventory: categoryPolicyPatchSchema.optional(),
          promotion: categoryPolicyPatchSchema.optional(),
          mail: categoryPolicyPatchSchema.optional(),
          negotiation: categoryPolicyPatchSchema.optional(),
          customer: categoryPolicyPatchSchema.optional(),
        })
        .optional(),
      agentOverrides: z
        .record(z.enum([
          'pricing',
          'supplier',
          'inventory',
          'promotion',
          'mail',
          'negotiation',
          'customer',
          'forecast',
          'catalog',
          'outcomes',
          'approvals',
        ]), agentOverridePatchSchema)
        .optional(),
      customRules: z.array(customRulePatchSchema).max(10).optional(),
    })
    .optional(),
});

const createGoalSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  metricType: z.enum(['margin', 'revenue', 'inventory', 'category_revenue']),
  metricScope: z
    .object({
      categoryId: z.string().optional(),
      productSlug: z.string().optional(),
      threshold: z.number().optional(),
    })
    .optional(),
  targetValue: z.number(),
  baselineValue: z.number().optional(),
  unit: z.enum(['percent', 'count', 'currency']).optional(),
  direction: z.enum(['increase', 'decrease']).optional(),
  deadline: z.string().min(1),
  pursuitMode: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  parentGoalId: z.string().optional(),
});

const updateGoalSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  targetValue: z.number().optional(),
  deadline: z.string().optional(),
  status: z.enum(['active', 'paused', 'completed', 'abandoned']).optional(),
  pursuitMode: z.enum(['conservative', 'balanced', 'aggressive']).optional(),
  parentGoalId: z.string().optional(),
});

const proactiveSnoozeSchema = z.object({
  hours: z.number().min(1).max(168).optional(),
});

const brainToolExecuteSchema = z.object({
  proposalId: z.string().min(1),
  commandId: z.string().optional(),
});

async function buildDashboardPayload(tenantId: string) {
  const { adminData, proactiveSuggestionService } = getCompositionRoot();
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
    proactiveCount,
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
    proactiveSuggestionService.countActive(tenantId),
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
    proactiveCount,
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

  getProactiveSuggestions = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { proactiveSuggestionService } = getCompositionRoot();
      const items = await proactiveSuggestionService.listActiveDtos(req.tenantId!);
      res.json({ suggestions: items });
    },
  ];

  dismissProactiveSuggestion = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { proactiveSuggestionService } = getCompositionRoot();
      const ok = await proactiveSuggestionService.dismiss(req.tenantId!, req.params.id);
      if (!ok) {
        res.status(404).json({ success: false, error: 'Suggestion not found' });
        return;
      }
      res.json({ success: true });
    },
  ];

  snoozeProactiveSuggestion = [
    requireOperator,
    validateBody(proactiveSnoozeSchema),
    async (req: Request, res: Response) => {
      const body = req.body as { hours?: number };
      const { proactiveSuggestionService } = getCompositionRoot();
      const ok = await proactiveSuggestionService.snooze(req.tenantId!, req.params.id, body.hours);
      if (!ok) {
        res.status(404).json({ success: false, error: 'Suggestion not found' });
        return;
      }
      res.json({ success: true });
    },
  ];

  executeProactiveSuggestion = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { proactiveSuggestionService, executeNaturalLanguageCommand } = getCompositionRoot();
      const record = await proactiveSuggestionService.getById(req.tenantId!, req.params.id);
      if (!record || record.status === 'dismissed' || record.status === 'executed') {
        res.status(404).json({ success: false, error: 'Suggestion not found' });
        return;
      }

      const acceptStream = req.headers.accept?.includes('text/event-stream');

      if (acceptStream && process.env.COMMAND_BRAIN_STREAMING_ENABLED === 'true') {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders?.();

        const abortController = new AbortController();
        req.on('close', () => abortController.abort());

        const result = await executeNaturalLanguageCommand.execute(
          record.command,
          {
            tenantId: req.tenantId!,
            actorId: req.actorId,
            proactiveContext: {
              agentKey: record.agentKey ?? undefined,
              intentId: record.intentId,
              evidence: record.evidence,
              detectionRunId: record.detectionRunId ?? undefined,
            },
          },
          {
            onEvent: (event) => {
              res.write(`data: ${JSON.stringify(event)}\n\n`);
            },
            abortSignal: abortController.signal,
          }
        );
        await proactiveSuggestionService.markExecuted(req.tenantId!, req.params.id);
        res.write(`data: ${JSON.stringify({ type: 'result', result })}\n\n`);
        res.end();
        return;
      }

      const result = await executeNaturalLanguageCommand.execute(record.command, {
        tenantId: req.tenantId!,
        actorId: req.actorId,
        proactiveContext: {
          agentKey: record.agentKey ?? undefined,
          intentId: record.intentId,
          evidence: record.evidence,
          detectionRunId: record.detectionRunId ?? undefined,
        },
      });
      await proactiveSuggestionService.markExecuted(req.tenantId!, req.params.id);
      res.json({ success: true, result });
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

  getRunSharedMemory = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { runWorkingMemory } = getCompositionRoot();
      if (!runWorkingMemory) {
        res.status(404).json({ error: 'Shared memory not configured' });
        return;
      }
      const entries = await runWorkingMemory.list(req.tenantId!, req.params.runId);
      res.json({ runId: req.params.runId, entries });
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
      const agentKey = req.query.agentKey ? String(req.query.agentKey) : undefined;

      const since = resolveActivitySince(days, sinceIso);
      const feed = await buildActivityFeed({
        tenantId: req.tenantId!,
        since,
        limit,
        module,
        includeNav,
        agentKey,
      });
      res.json(feed);
    },
  ];

  getAgentsRoster = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { agentRosterService } = getCompositionRoot();
      if (!agentRosterService) {
        res.status(503).json({ error: 'Agent roster not configured' });
        return;
      }
      const agents = await agentRosterService.buildRoster(req.tenantId!);
      res.json({ agents });
    },
  ];

  getAgentMetrics = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { agentRegistry } = getCompositionRoot();
      const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
      const result = await buildAgentMetrics(req.tenantId!, agentRegistry, days);
      res.json(result);
    },
  ];

  getOverviewFeed = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { proactiveSuggestionService } = getCompositionRoot();
      const days = req.query.days ? parseInt(String(req.query.days), 10) : 7;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
      const proactiveDtos = await proactiveSuggestionService.listActiveDtos(req.tenantId!);
      const feed = await buildOverviewFeed(
        {
          tenantId: req.tenantId!,
          days,
          limit,
          cursor: req.query.cursor ? String(req.query.cursor) : undefined,
          agentKey: req.query.agentKey ? String(req.query.agentKey) : undefined,
          risk:
            req.query.risk === 'high' || req.query.risk === 'low'
              ? req.query.risk
              : undefined,
          module: req.query.module ? String(req.query.module) : undefined,
          executionMode:
            req.query.executionMode === 'autonomous' ||
            req.query.executionMode === 'approval_required' ||
            req.query.executionMode === 'inform_only'
              ? req.query.executionMode
              : undefined,
          actionType:
            req.query.actionType === 'proactive' ||
            req.query.actionType === 'autonomous' ||
            req.query.actionType === 'goal' ||
            req.query.actionType === 'approval'
              ? req.query.actionType
              : undefined,
          search: req.query.search ? String(req.query.search).slice(0, 100) : undefined,
        },
        proactiveDtos,
      );
      res.json(feed);
    },
  ];

  getOverviewHandoffs = [
    requireViewer,
    async (req: Request, res: Response) => {
      const days = req.query.days ? parseInt(String(req.query.days), 10) : 7;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 15;
      const items = await listRecentHandoffs(req.tenantId!, days, limit);
      res.json({ items });
    },
  ];

  getAgentActivity = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { agentRosterService } = getCompositionRoot();
      if (!agentRosterService) {
        res.status(503).json({ error: 'Agent roster not configured' });
        return;
      }
      const days = req.query.days ? parseInt(String(req.query.days), 10) : 7;
      const activity = await agentRosterService.getAgentActivity(
        req.tenantId!,
        req.params.agentKey,
        days
      );
      res.json(activity);
    },
  ];

  getNotifications = [
    requireViewer,
    async (req: Request, res: Response) => {
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 30;
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined;
      const groupKey = req.query.groupKey ? String(req.query.groupKey) : undefined;
      const actorId = req.actorId ?? 'api-key-user';
      const inbox = await buildNotificationInbox(req.tenantId!, actorId, limit, cursor, groupKey);
      res.json(inbox);
    },
  ];

  getWebPushVapidKey = [
    requireViewer,
    (_req: Request, res: Response) => {
      res.json({ publicKey: getWebPushPublicKey() });
    },
  ];

  subscribeWebPush = [
    requireViewer,
    validateBody(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
        userAgent: z.string().optional(),
      }),
    ),
    async (req: Request, res: Response) => {
      const actorId = req.actorId ?? 'api-key-user';
      const body = req.body as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
        userAgent?: string;
      };
      const { prisma } = await import('../../../../shared/prisma/client');
      await prisma.pushSubscription.upsert({
        where: { endpoint: body.endpoint },
        update: {
          tenantId: req.tenantId!,
          actorId,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          userAgent: body.userAgent,
        },
        create: {
          tenantId: req.tenantId!,
          actorId,
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          userAgent: body.userAgent,
        },
      });
      res.status(204).send();
    },
  ];

  unsubscribeWebPush = [
    requireViewer,
    validateBody(z.object({ endpoint: z.string().url() })),
    async (req: Request, res: Response) => {
      const body = req.body as { endpoint: string };
      const { prisma } = await import('../../../../shared/prisma/client');
      await prisma.pushSubscription.deleteMany({ where: { endpoint: body.endpoint } });
      res.status(204).send();
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
      const entityType = String(req.query.entityType ?? 'email') as
        | 'email'
        | 'approval'
        | 'command'
        | 'proactive_suggestion';
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

  getExplainabilityDiff = [
    requireViewer,
    async (req: Request, res: Response) => {
      const leftType = String(req.query.leftType ?? '') as import('../../../../ai/intelligence/explainability/types').ExplainabilitySourceType;
      const leftId = String(req.query.leftId ?? '');
      const rightType = String(req.query.rightType ?? '') as import('../../../../ai/intelligence/explainability/types').ExplainabilitySourceType;
      const rightId = String(req.query.rightId ?? '');
      if (!leftId || !rightId) {
        res.status(400).json({ error: 'leftId and rightId required' });
        return;
      }
      try {
        const { explainabilityDiffService } = await import(
          '../../../../ai/intelligence/explainability/ExplainabilityDiffService'
        );
        const diff = await explainabilityDiffService.diff({
          tenantId: req.tenantId!,
          left: { sourceType: leftType, sourceId: leftId },
          right: { sourceType: rightType, sourceId: rightId },
        });
        res.json(diff);
      } catch {
        res.status(404).json({ error: 'Diff not found' });
      }
    },
  ];

  exportExplainability = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getMerchantSettings } = await import('../../../../shared/settings/TenantSettingsService');
      const { explainabilityExportService } = await import(
        '../../../../ai/intelligence/explainability/ExplainabilityExportService'
      );
      const settings = await getMerchantSettings(req.tenantId!);
      if (!settings.dataExportEnabled) {
        res.status(403).json({ error: 'Data export disabled for this tenant' });
        return;
      }

      const entityType = String(req.query.entityType ?? 'command') as
        | 'command'
        | 'proactive_suggestion'
        | 'proactive_auto';
      const entityId = String(req.query.entityId ?? '');
      const format = String(req.query.format ?? 'json') as 'json' | 'pdf';
      if (!entityId) {
        res.status(400).json({ error: 'entityId query required' });
        return;
      }

      try {
        const bundle = await explainabilityExportService.exportSingle({
          tenantId: req.tenantId!,
          entityType,
          entityId,
          actorId: req.actorId,
        });

        if (format === 'pdf') {
          const pdf = await explainabilityExportService.renderPdf(bundle);
          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="explainability-${entityId}.pdf"`
          );
          res.send(pdf);
          return;
        }

        res.json(bundle);
      } catch {
        res.status(404).json({ error: 'Export not found' });
      }
    },
  ];

  auditExportExplainability = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { getMerchantSettings } = await import('../../../../shared/settings/TenantSettingsService');
      const { explainabilityExportService } = await import(
        '../../../../ai/intelligence/explainability/ExplainabilityExportService'
      );
      const settings = await getMerchantSettings(req.tenantId!);
      if (!settings.dataExportEnabled) {
        res.status(403).json({ error: 'Data export disabled for this tenant' });
        return;
      }

      const since = req.query.since
        ? new Date(String(req.query.since))
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const until = req.query.until ? new Date(String(req.query.until)) : new Date();
      const format = String(req.query.format ?? 'json') as 'json' | 'pdf';

      const bundle = await explainabilityExportService.exportAuditRange({
        tenantId: req.tenantId!,
        since,
        until,
        actorId: req.actorId,
      });

      if (format === 'pdf') {
        const pdf = await explainabilityExportService.renderPdf({
          exportedAt: bundle.exportedAt,
          tenantId: bundle.tenantId,
          snapshot: bundle.snapshots[0] ?? {
            id: 'bulk',
            sourceType: 'audit',
            sourceId: 'bulk',
            summary: `Audit export (${bundle.count} snapshots)`,
            summarySource: 'template',
            detailLevel: 'simple',
            agentKeys: [],
            createdAt: bundle.exportedAt,
            payload: {
              summary: '',
              agents: [],
              dataSources: [],
              reasoningSteps: [],
              reflections: [],
            },
          },
          timeline: {
            entityType: 'command',
            entityId: 'audit',
            detailLevel: 'simple',
            summary: `Bulk audit export: ${bundle.count} snapshots`,
            sections: [],
          },
          auditEntries: [],
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="explainability-audit.pdf"');
        res.send(pdf);
        return;
      }

      res.json(bundle);
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
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', APPROVAL_POLICY_SUNSET);
      res.setHeader('Link', '</api/admin/settings>; rel="successor-version"');
      const policy = await getTenantApprovalPolicy(req.tenantId!);
      res.json({ status: 'live', policy, deprecated: true, useSettings: '/api/admin/settings' });
    },
  ];

  updateApprovalPolicy = [
    requireOperator,
    validateBody(policyPatchSchema),
    async (req: Request, res: Response) => {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', APPROVAL_POLICY_SUNSET);
      res.setHeader('Link', '</api/admin/settings>; rel="successor-version"');
      const policy = await setTenantApprovalPolicy(req.tenantId!, req.body as Partial<TenantApprovalPolicy>);
      await writeAuditLog({
        tenantId: req.tenantId!,
        module: 'admin-command-bar',
        action: 'approval_policy_updated',
        actor: req.actorId,
        details: { ...policy },
      });
      res.json({ success: true, policy, deprecated: true, useSettings: '/api/admin/settings' });
    },
  ];

  simulateAutonomy = [
    requireViewer,
    validateBody(autonomySimulateSchema),
    async (req: Request, res: Response) => {
      const body = req.body as z.infer<typeof autonomySimulateSchema>;
      const settings = await getMerchantSettings(req.tenantId!);
      const now = body.simulateAt ? new Date(body.simulateAt) : new Date();
      const result = await assessAutonomyWithTraceForTenant({
        tenantId: req.tenantId!,
        module: body.module,
        actionType: body.actionType,
        tool: body.tool,
        intent: body.intent,
        agentKey: body.agentKey,
        payload: body.payload,
        riskClass: body.riskClass,
        now,
        getSettings: getMerchantSettings,
      });
      res.json({
        assessment: {
          executionMode: result.executionMode,
          eligible: result.eligible,
          reason: result.reason,
          reasonCode: result.reasonCode,
          riskClass: result.riskClass,
          category: result.category,
        },
        trace: result.trace,
        matchedRuleId: result.matchedRuleId,
        settingsSnapshot: {
          preset: settings.autonomyPrefs.preset,
          autonomyLevel: settings.autonomyLevel,
          policyEnabled: settings.policyEnabled,
        },
      });
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

  listGoals = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const includeCompleted = req.query.includeCompleted === 'true';
      const goals = await goalService.listGoals(req.tenantId!, includeCompleted);
      res.json({ goals });
    },
  ];

  getGoal = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const detail = await goalService.getGoalWithSnapshots(req.tenantId!, req.params.id);
      if (!detail) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json(detail);
    },
  ];

  createGoal = [
    requireOperator,
    validateBody(createGoalSchema),
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      try {
        const goal = await goalService.createGoal(req.tenantId!, req.body);
        res.status(201).json({ goal });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Goal creation failed';
        res.status(400).json({ error: message });
      }
    },
  ];

  updateGoal = [
    requireOperator,
    validateBody(updateGoalSchema),
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const goal = await goalService.updateGoal(req.tenantId!, req.params.id, req.body);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json({ goal });
    },
  ];

  deleteGoal = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const ok = await goalService.deleteGoal(req.tenantId!, req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      res.json({ ok: true });
    },
  ];

  refreshGoal = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const result = await goalService.refreshGoal(req.tenantId!, req.params.id);
      if (!result) {
        res.status(404).json({ error: 'Goal not found or not active' });
        return;
      }
      res.json(result);
    },
  ];

  getGoalSuggestions = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const goal = await goalService.getGoal(req.tenantId!, req.params.id);
      if (!goal) {
        res.status(404).json({ error: 'Goal not found' });
        return;
      }
      const suggestions = await goalService.listLinkedSuggestions(req.tenantId!, req.params.id);
      res.json({ suggestions });
    },
  ];

  listAiGoalSuggestions = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const suggestions = await goalService.listAiSuggestions(req.tenantId!);
      res.json({ suggestions });
    },
  ];

  acceptAiGoalSuggestion = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      try {
        const goal = await goalService.acceptAiSuggestion(req.tenantId!, req.params.id);
        res.status(201).json({ goal });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Accept failed';
        res.status(400).json({ error: message });
      }
    },
  ];

  dismissAiGoalSuggestion = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      await goalService.dismissAiSuggestion(req.tenantId!, req.params.id);
      res.json({ ok: true });
    },
  ];

  getGoalConflicts = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const analysis = await goalService.getConflictAnalysis(req.tenantId!);
      res.json(analysis);
    },
  ];

  buildGoalPlan = [
    requireOperator,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const plan = await goalService.buildPlan(req.tenantId!);
      if (!plan) {
        res.status(404).json({ error: 'No active goals or planning disabled' });
        return;
      }
      res.json({ plan });
    },
  ];

  getActiveGoalPlan = [
    requireViewer,
    async (req: Request, res: Response) => {
      const { goalService } = getCompositionRoot();
      const plan = await goalService.getActivePlan(req.tenantId!);
      res.json({ plan });
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
          const { proactiveSuggestionService } = getCompositionRoot();
          const [payload, proactiveCount] = await Promise.all([
            buildDashboardPayload(tenantId),
            proactiveSuggestionService.countActive(tenantId),
          ]);
          res.write(`data: ${JSON.stringify({ ...payload, proactiveCount })}\n\n`);
        } catch {
          if (!closed) res.write(`event: error\ndata: {"message":"stream tick failed"}\n\n`);
        }
      };

      const pushProactive = (event: {
        type: string;
        ids: string[];
        count: number;
        ts: number;
      }) => {
        if (closed) return;
        res.write(
          `data: ${JSON.stringify({
            type: 'proactive_updated',
            proactiveCount: event.count,
            suggestionIds: event.ids,
            eventType: event.type,
            ts: event.ts,
          })}\n\n`
        );
      };

      await push();
      const interval = setInterval(push, 5000);

      let unsubscribe: (() => void) | undefined;
      let unsubscribeOverview: (() => void) | undefined;
      let unsubscribeNotification: (() => void) | undefined;
      if (isProactiveSseEnabled()) {
        unsubscribe = proactiveSuggestionEmitter.subscribe(tenantId, pushProactive);
      }

      const pushNotification = (event: Record<string, unknown>) => {
        if (closed) return;
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      if (isNotificationSseEnabled()) {
        unsubscribeNotification = notificationEmitter.subscribe(tenantId, pushNotification);
      }

      const pushOverviewItem = (event: {
        type: string;
        item: { kind: string; at: string; id: string; cursor: string; payload: Record<string, unknown> };
        ts: number;
      }) => {
        if (closed) return;
        res.write(
          `data: ${JSON.stringify({
            type: 'overview_item',
            event: event.type,
            item: event.item,
            ts: event.ts,
          })}\n\n`,
        );
      };

      if (isOverviewSseEnabled()) {
        unsubscribeOverview = overviewFeedEmitter.subscribe(tenantId, pushOverviewItem);
      }

      const sinceCursorRaw = req.query.sinceCursor ? String(req.query.sinceCursor) : undefined;
      const sinceCursor = decodeOverviewCursor(sinceCursorRaw);
      if (sinceCursor || sinceCursorRaw === '') {
        try {
          const missed = await listOverviewFeedEventsSince(tenantId, sinceCursor, 50);
          for (const item of missed.reverse()) {
            pushOverviewItem({
              type: 'created',
              item,
              ts: Date.now(),
            });
          }
        } catch {
          /* replay best-effort */
        }
      }

      req.on('close', () => {
        closed = true;
        clearInterval(interval);
        unsubscribe?.();
        unsubscribeOverview?.();
        unsubscribeNotification?.();
      });
    },
  ];
}
