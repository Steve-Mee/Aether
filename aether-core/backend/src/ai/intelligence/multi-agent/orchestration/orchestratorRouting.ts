import { compoundToExecutionPlan } from '../PlanNodeBuilder';
import {
  isMultiAgentDelegationEnabled,
  resolveDelegationTarget,
} from '../delegationConfig';
import {
  needsSupplierIntel as collaborationNeedsSupplierIntel,
} from '../AgentCollaborationPolicy';
import { isGraphOrchestrationEnabled } from '../graph/graphOrchestrationConfig';
import type {
  ExecutionPlan,
  RouteDecision,
  SpecialistAgentDefinition,
  SpecialistExecuteRequest,
} from '../types';
import type { OrchestratorDeps } from './orchestratorDeps';

export function isDelegationEnabled(): boolean {
  return isMultiAgentDelegationEnabled();
}

export function isGraphOrchestrationEnabledFor(deps: OrchestratorDeps): boolean {
  return deps.graphOrchestrator?.isEnabled() ?? isGraphOrchestrationEnabled();
}

export async function route(
  deps: OrchestratorDeps,
  intent: string,
  command?: string,
  options?: { confidence?: number; onEvent?: SpecialistExecuteRequest['onEvent'] }
): Promise<SpecialistAgentDefinition | null> {
  const decision = await routeDecision(deps, intent, command, options);
  return decision.agent;
}

export async function routeDecision(
  deps: OrchestratorDeps,
  intent: string,
  command?: string,
  options?: { confidence?: number; tenantId?: string; onEvent?: SpecialistExecuteRequest['onEvent'] }
): Promise<RouteDecision> {
  if (!isMultiAgentDelegationEnabled()) {
    return { agent: null, agentKey: null, confidence: 0, reason: 'disabled', source: 'none' };
  }

  if (deps.agentRouter && command) {
    return deps.agentRouter.route({ intent, command, confidence: options?.confidence, tenantId: options?.tenantId });
  }

  const agent = deps.agentRegistry.resolve(intent, command) ?? null;
  return {
    agent,
    agentKey: agent?.agentKey ?? null,
    confidence: agent ? 1 : 0,
    reason: agent ? `intent:${intent}` : 'no match',
    source: agent ? 'intent' : 'none',
  };
}

export async function routePlan(
  deps: OrchestratorDeps,
  intent: string,
  command?: string,
  options?: { confidence?: number; tenantId?: string }
): Promise<ExecutionPlan> {
  if (!isMultiAgentDelegationEnabled()) {
    return { mode: 'single', agents: [], routingSource: 'none', routingReason: 'disabled' };
  }

  if (deps.agentRouter && command) {
    return deps.agentRouter.routePlan({
      intent,
      command,
      confidence: options?.confidence,
      tenantId: options?.tenantId,
    });
  }

  const agent = deps.agentRegistry.resolve(intent, command);
  return {
    mode: 'single',
    agents: agent ? [{ agentKey: agent.agentKey, intent }] : [],
    routingSource: agent ? 'intent' : 'none',
    routingReason: agent ? `intent:${intent}` : 'no match',
  };
}

export function resolveTargetAgent(deps: OrchestratorDeps, intent: string): string | null {
  const fromRegistry = deps.agentRegistry.resolveByIntent(intent);
  if (fromRegistry) return fromRegistry.agentKey;
  return resolveDelegationTarget(intent);
}

export function resolveExecutionPlan(
  deps: OrchestratorDeps,
  command: string,
  intent: string,
  subGoals?: Array<{ intent: string; command: string }>,
  connector: 'sequential' | 'parallel' = 'sequential'
): ExecutionPlan {
  if (intent === 'COMPOUND_WORKFLOW' && subGoals?.length) {
    return compoundToExecutionPlan(subGoals, deps.agentRegistry, connector);
  }

  const single = deps.agentRegistry.resolve(intent, command);
  return {
    mode: 'single',
    agents: single ? [{ agentKey: single.agentKey, intent }] : [],
  };
}

export function needsSupplierIntel(command: string, intent: string): boolean {
  return collaborationNeedsSupplierIntel(command, intent);
}
