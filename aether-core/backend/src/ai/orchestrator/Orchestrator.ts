import { eventBus } from '../../shared/events/eventBus';
import { writeAuditLog } from '../../shared/audit/auditService';
import { logger } from '../../shared/logging/logger';
import { workflowEngine, PolicyDecision } from './WorkflowEngine';
import { telemetry } from '../../shared/observability/telemetry';
import { executeOrchestratorTask } from './TaskExecutor';

export type AgentTask =
  | 'mail.classify'
  | 'supplier.sync'
  | 'admin.command'
  | 'pricing.adjust'
  | 'negotiation.step';

export interface OrchestratorContext {
  tenantId: string;
  actorId?: string;
  task: AgentTask;
  input: Record<string, unknown>;
}

export interface OrchestratorResult {
  success: boolean;
  output: Record<string, unknown>;
  events: string[];
  runId?: string;
  policy?: PolicyDecision;
}

export class AIOrchestrator {
  async execute(ctx: OrchestratorContext): Promise<OrchestratorResult> {
    telemetry.startSpan(`orchestrator.${ctx.task}`, { tenantId: ctx.tenantId });
    logger.info('orchestrator_execute', { task: ctx.task, tenantId: ctx.tenantId });

    const policy = workflowEngine.evaluatePolicy(ctx.task, ctx.input);
    const runId = await workflowEngine.startRun(ctx.tenantId, ctx.task, ctx.input);

    const output = await executeOrchestratorTask(ctx);
    const executed = output.executed !== false;
    const skipPublish = output.mode === 'already_executed';

    const eventMap: Partial<Record<AgentTask, string>> = {
      'mail.classify': 'mail.processed',
      'supplier.sync': 'supplier.sync_completed',
      'admin.command': 'command.executed',
      'negotiation.step': 'negotiation.updated',
    };
    const events: string[] =
      executed && !skipPublish && eventMap[ctx.task] ? [eventMap[ctx.task]!] : [];

    await workflowEngine.addStep(runId, 'policy', 'completed', {
      requiresApproval: policy.requiresApproval,
      riskClass: policy.riskClass,
    });

    if (executed) {
      await workflowEngine.addStep(runId, 'execute', 'completed', output);
    } else {
      await workflowEngine.addStep(runId, 'execute', 'skipped', output);
    }

    for (const type of events) {
      await eventBus.publish({
        tenantId: ctx.tenantId,
        type: type as Parameters<typeof eventBus.publish>[0]['type'],
        payload: { ...output, actorId: ctx.actorId, runId, policy },
      });
    }

    await writeAuditLog({
      tenantId: ctx.tenantId,
      module: 'orchestrator',
      action: ctx.task,
      actor: ctx.actorId,
      details: { runId, policy, output, executed },
    });

    telemetry.endSpan(`orchestrator.${ctx.task}`, { runId, executed: executed ? 1 : 0 });

    return { success: executed, output, events, runId, policy };
  }
}

export const orchestrator = new AIOrchestrator();
