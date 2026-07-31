import type { AgentStreamCallback } from '../../../../../ai/intelligence/command-brain/AgentStreamEvents';
import type { AgentSupervisorPort } from '../../../../../ai/intelligence/multi-agent/AgentSupervisorPort';
import { isNestedPlansEnabled } from '../../../../../ai/intelligence/multi-agent/parallelConfig';
import { shouldSkipHandlerForSpecialist } from '../../../../../ai/intelligence/multi-agent/delegationConfig';

export interface ResolveCommandRoutingDeps {
  agentSupervisor?: AgentSupervisorPort;
}

export interface ResolveCommandRoutingInput {
  tenantId: string;
  naturalLanguage: string;
  parsed: { intent: string; confidence: number };
  streamOptions?: { onEvent?: AgentStreamCallback; abortSignal?: AbortSignal };
}

export async function resolveCommandRouting(
  deps: ResolveCommandRoutingDeps,
  input: ResolveCommandRoutingInput
) {
  const { tenantId, naturalLanguage, parsed, streamOptions } = input;
  const delegationEnabled = deps.agentSupervisor?.isDelegationEnabled() ?? false;

  const routePlan =
    delegationEnabled &&
    (parsed.intent !== 'COMPOUND_WORKFLOW' || isNestedPlansEnabled()) &&
    deps.agentSupervisor?.routePlan
      ? await deps.agentSupervisor.routePlan(parsed.intent, naturalLanguage, {
          confidence: parsed.confidence,
          tenantId,
        })
      : null;

  const routeDecision =
    delegationEnabled && deps.agentSupervisor?.routeDecision
      ? await deps.agentSupervisor.routeDecision(parsed.intent, naturalLanguage, {
          confidence: parsed.confidence,
          tenantId,
        })
      : null;

  const multiAgentPlan = Boolean(routePlan && (routePlan.agents?.length ?? 0) > 1);
  const multiAgentParallel = routePlan?.mode === 'parallel';
  const multiAgentSequential = routePlan?.mode === 'sequential';

  const specialistDef =
    multiAgentPlan
      ? null
      : routeDecision?.agent ??
        (routePlan?.agents?.[0]?.agentKey && routeDecision?.agentKey === routePlan.agents[0].agentKey
          ? routeDecision.agent
          : null) ??
        (delegationEnabled && deps.agentSupervisor?.route
          ? await deps.agentSupervisor.route(parsed.intent, naturalLanguage, {
              confidence: parsed.confidence,
              onEvent: streamOptions?.onEvent,
            })
          : null);

  const specialistWillHandle =
    delegationEnabled &&
    (multiAgentPlan ||
      (specialistDef !== null && shouldSkipHandlerForSpecialist(parsed.intent, true)));

  return {
    delegationEnabled,
    routePlan,
    routeDecision,
    multiAgentPlan,
    multiAgentParallel,
    multiAgentSequential,
    specialistDef,
    specialistWillHandle,
  };
}
