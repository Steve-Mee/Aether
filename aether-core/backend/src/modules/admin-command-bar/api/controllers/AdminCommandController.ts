import { Request, Response } from 'express';
import { getBrainAgentRunByCommandId, cancelBrainAgentRunByCommandId } from '../../../../ai/intelligence/command-brain/BrainAgentRunStore';
import { getCompositionRoot } from '../../../../bootstrap/compositionRoot';
import { writeAuditLog } from '../../../../shared/audit/auditService';
import { requireOperator, requireViewer } from '../../../../shared/security/rbac';
import { validateBody } from '../../../../shared/security/validate';
import { buildDashboardPayload } from '../../application/services/DashboardPayloadService';
import { emailAnalyticsAdapter } from '../../../aether-mail/infrastructure/adapters/PrismaEmailAnalyticsAdapter';
import {
  brainToolExecuteSchema,
  commandSchema,
  proactiveSnoozeSchema,
  uiEventSchema,
} from '../schemas/adminSchemas';

export class AdminCommandController {
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
      res.json(await buildDashboardPayload(req.tenantId!, emailAnalyticsAdapter));
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
}
