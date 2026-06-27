import { prisma } from '../../shared/prisma/client';
import { telemetry } from '../../shared/observability/telemetry';

export type RiskClass = 'low' | 'medium' | 'high';

export interface PolicyDecision {
  allowed: boolean;
  requiresApproval: boolean;
  riskClass: RiskClass;
  reason: string;
}

const TASK_TO_ACTION: Record<string, string> = {
  'mail.classify': 'email.auto_reply',
  'mail.analyze': 'brain.recall',
  'supplier.sync': 'supplier.monitor',
  'supplier.delegate': 'brain.recall',
  'inventory.analyze': 'brain.recall',
  'negotiation.delegate': 'negotiation.counter',
  'physical.sync': 'brain.recall',
  'admin.command': 'admin.command',
  'pricing.adjust': 'price.change',
  'negotiation.step': 'negotiation.counter',
  'brain.recall': 'brain.recall',
  'brain.remember': 'brain.remember',
  'insight.submit': 'insight.submit',
  'knowledge.contribute': 'knowledge.contribute',
  'knowledge.pull': 'knowledge.pull',
  'knowledge.distill': 'knowledge.distill',
  'knowledge.federate': 'knowledge.federate',
  'knowledge.experiment.record': 'knowledge.experiment.record',
  'command.brain.prepare': 'brain.recall',
};

export class PolicyEngine {
  evaluate(action: string, context: Record<string, unknown> = {}): PolicyDecision {
    const mapped = TASK_TO_ACTION[action] ?? action;
    const highRiskActions = ['payment.refund', 'code.apply', 'supplier.bulk_sync'];
    const mediumRiskActions = ['email.auto_reply', 'price.change', 'negotiation.counter', 'admin.command', 'supplier.monitor', 'insight.submit'];
    const lowRiskActions = ['brain.recall', 'brain.remember', 'knowledge.pull', 'knowledge.contribute', 'knowledge.distill', 'knowledge.federate', 'knowledge.experiment.record', 'command.brain.prepare'];

    if (highRiskActions.includes(mapped)) {
      return { allowed: true, requiresApproval: true, riskClass: 'high', reason: 'High-risk action' };
    }
    if (mediumRiskActions.includes(mapped)) {
      const amount = context.amount as number | undefined;
      if (amount && amount > 1000) {
        return { allowed: true, requiresApproval: true, riskClass: 'medium', reason: 'Amount threshold exceeded' };
      }
      return { allowed: true, requiresApproval: false, riskClass: 'medium', reason: 'Medium-risk auto-allowed' };
    }
    if (lowRiskActions.includes(mapped)) {
      return { allowed: true, requiresApproval: false, riskClass: 'low', reason: 'Low-risk brain action' };
    }
    return { allowed: true, requiresApproval: false, riskClass: 'low', reason: 'Low-risk action' };
  }
}

export class WorkflowEngine {
  constructor(private policy: PolicyEngine = new PolicyEngine()) {}

  async startRun(tenantId: string, workflow: string, input: Record<string, unknown>): Promise<string> {
    telemetry.startSpan(`workflow.${workflow}`, { tenantId });
    const run = await prisma.workflowRun.create({
      data: { tenantId, workflow, status: 'running' },
    });
    await prisma.workflowStep.create({
      data: {
        runId: run.id,
        name: 'start',
        status: 'completed',
        input: JSON.stringify(input),
      },
    });
    telemetry.endSpan(`workflow.${workflow}`, { runId: run.id });
    return run.id;
  }

  async addStep(runId: string, name: string, status: string, output?: Record<string, unknown>): Promise<void> {
    await prisma.workflowStep.create({
      data: {
        runId,
        name,
        status,
        output: output ? JSON.stringify(output) : undefined,
      },
    });
  }

  evaluatePolicy(task: string, context: Record<string, unknown>): PolicyDecision {
    return this.policy.evaluate(task, context);
  }

  async getRunTrace(runId: string, tenantId: string) {
    const run = await prisma.workflowRun.findFirst({
      where: { id: runId, tenantId },
      include: { steps: { orderBy: { createdAt: 'asc' } } },
    });
    if (!run) return null;
    return {
      id: run.id,
      workflow: run.workflow,
      status: run.status,
      createdAt: run.createdAt,
      steps: run.steps.map((s) => ({
        name: s.name,
        status: s.status,
        input: s.input ? JSON.parse(s.input) : undefined,
        output: s.output ? JSON.parse(s.output) : undefined,
        createdAt: s.createdAt,
      })),
    };
  }
}

export const workflowEngine = new WorkflowEngine();
export const policyEngine = new PolicyEngine();
