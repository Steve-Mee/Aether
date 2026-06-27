import { merchantAutonomyKernel } from '../../../autonomy/DecisionContract';
import { getAutonomyMetrics } from '../../../../shared/autonomy/AutonomyMetricsService';
import type { DecisionRepository } from '../../../../modules/autonomous-operations/domain/repositories/DecisionRepository';
import type { BrainToolExecutor } from '../../personal-brain/tools/types';
import { assessAutonomousRouteAllowed } from '../autonomyRouting';

export interface AutonomyToolsDeps {
  decisionRepository?: DecisionRepository;
}

export function getAutonomyMetricsTool(): BrainToolExecutor {
  return {
    definition: {
      name: 'getAutonomyMetrics',
      description: 'Fetch autonomy KPIs: decision counts, autonomy rate, and per-module breakdown',
      parameters: {
        periodDays: { type: 'number', required: false, description: 'Lookback period in days (default 30)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'autonomous-operations',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const periodDays = Math.min(Number(input.periodDays ?? 30), 90);
      const metrics = await getAutonomyMetrics(ctx.tenantId, periodDays);
      return { success: true, metrics };
    },
  };
}

export function listDecisionsTool(deps: AutonomyToolsDeps): BrainToolExecutor {
  return {
    definition: {
      name: 'listDecisions',
      description: 'List recent autonomous decisions for the tenant',
      parameters: {
        limit: { type: 'number', required: false, description: 'Max decisions (default 20)' },
      },
      risk: 'low',
      kind: 'read',
      module: 'autonomous-operations',
    },
    validate() {
      return { ok: true };
    },
    async executeRead(ctx, input) {
      if (!deps.decisionRepository) {
        return { success: false, error: 'Decision repository not available' };
      }
      const limit = Math.min(Number(input.limit ?? 20), 50);
      const decisions = await deps.decisionRepository.findAll(ctx.tenantId);
      return {
        success: true,
        count: Math.min(decisions.length, limit),
        decisions: decisions.slice(0, limit),
      };
    },
  };
}

export function evaluateDecisionTool(): BrainToolExecutor {
  return {
    definition: {
      name: 'evaluateDecision',
      description: 'Evaluate a proposed action against the Merchant Autonomy Kernel policy',
      parameters: {
        module: { type: 'string', required: true, description: 'Source module' },
        action: { type: 'string', required: true, description: 'Action type' },
        context: { type: 'object', required: false, description: 'Action context payload' },
      },
      risk: 'low',
      kind: 'read',
      module: 'autonomous-operations',
    },
    validate(input) {
      if (!String(input.module ?? '').trim() || !String(input.action ?? '').trim()) {
        return { ok: false, error: 'module and action are required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const module = String(input.module ?? '').trim();
      const action = String(input.action ?? '').trim();
      const context =
        input.context && typeof input.context === 'object'
          ? (input.context as Record<string, unknown>)
          : {};
      const result = merchantAutonomyKernel.evaluate({
        tenantId: ctx.tenantId,
        module,
        action,
        context,
        actorId: ctx.actorId,
      });
      await merchantAutonomyKernel.recordDecision(
        { tenantId: ctx.tenantId, module, action, context, actorId: ctx.actorId },
        result
      );
      return { success: true, evaluation: result };
    },
  };
}

export function routeAutonomousDecisionTool(): BrainToolExecutor {
  return {
    definition: {
      name: 'routeAutonomousDecision',
      description:
        'Determine whether an autonomous decision may be routed to a domain specialist and which agent/intent to use',
      parameters: {
        decisionType: { type: 'string', required: true, description: 'Decision type identifier' },
        result: { type: 'string', required: true, description: 'Decision result summary' },
        rationale: { type: 'string', required: false, description: 'Optional rationale' },
      },
      risk: 'low',
      kind: 'read',
      module: 'autonomous-operations',
    },
    validate(input) {
      if (!String(input.decisionType ?? '').trim() || !String(input.result ?? '').trim()) {
        return { ok: false, error: 'decisionType and result are required' };
      }
      return { ok: true };
    },
    async executeRead(ctx, input) {
      const assessment = await assessAutonomousRouteAllowed({
        tenantId: ctx.tenantId,
        decisionType: String(input.decisionType),
        result: String(input.result),
        rationale: input.rationale ? String(input.rationale) : undefined,
      });
      return {
        success: true,
        allowed: assessment.allowed,
        reason: assessment.reason,
        requiresApproval: assessment.requiresApproval,
        route: assessment.route,
        delegateHint: assessment.allowed && assessment.route
          ? {
              agentKey: assessment.route.agentKey,
              intent: assessment.route.intent,
              command: `Autonomous decision ${input.decisionType}: ${input.result}`,
            }
          : null,
      };
    },
  };
}
