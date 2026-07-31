import { Request, Response } from 'express';
import { getAutonomyMetrics } from '../../../../shared/autonomy/AutonomyMetricsService';
import { workflowEngine } from '../../../../ai/orchestrator/WorkflowEngine';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import {
  loadFeatureStatusDocument,
} from '../../../../shared/truth/featureStatusRegistry';
import { getOperatingMetrics } from '../../../../shared/truth/operatingMetricsService';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { resolveActivitySince } from '../../application/services/ActivityFeedService';
import { buildAgentMetrics } from '../../application/services/AgentMetricsService';
import { handleOverviewStream } from '../sse/overviewStream';

export class AdminOverviewController {
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
      const { activityFeedService } = getCompositionRoot();
      const feed = await activityFeedService.buildActivityFeed({
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
      const { proactiveSuggestionService, overviewFeedService } = getCompositionRoot();
      const days = req.query.days ? parseInt(String(req.query.days), 10) : 7;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;
      const proactiveDtos = await proactiveSuggestionService.listActiveDtos(req.tenantId!);
      const feed = await overviewFeedService.buildOverviewFeed(
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
      const { handoffOverviewService } = getCompositionRoot();
      const items = await handoffOverviewService.listRecentHandoffs(req.tenantId!, days, limit);
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

  streamEvents = [
    requireViewer,
    handleOverviewStream,
  ];
}
