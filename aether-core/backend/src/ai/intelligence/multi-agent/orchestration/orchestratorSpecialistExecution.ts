import crypto from 'crypto';
import { emitStreamEvent } from '../../command-brain/AgentStreamEvents';
import { wrapAgentEvent } from '../agentStreamWrap';
import { DEFAULT_BRAIN_AGENT_KEY } from '../../global-knowledge/constants';
import { isRunMemoryEnabled } from '../memory/runMemoryConfig';
import { resolvePrependChainForPrimary } from '../AgentCollaborationPolicy';
import type {
  ResumeFromChildInput,
  ResumeFromChildResult,
  SpecialistAgentDefinition,
  SpecialistExecuteRequest,
  SpecialistExecuteResult,
} from '../types';
import { chainHandoff, type ChainHandoffInput } from './orchestratorChainHandoff';
import type { OrchestratorDeps } from './orchestratorDeps';

export async function executeSpecialist(
  deps: OrchestratorDeps,
  request: SpecialistExecuteRequest,
  resumeFromChild: (input: ResumeFromChildInput) => Promise<ResumeFromChildResult>
): Promise<SpecialistExecuteResult> {
  if (!deps.specialistRunner) {
    return { narrative: request.handlerResult, error: 'Specialist runner not configured' };
  }

  const def =
    deps.agentRegistry.get(request.agentKey) ??
    deps.agentRegistry.resolve(request.intent, request.command);
  if (!def) {
    return { narrative: request.handlerResult, error: 'No specialist agent for intent' };
  }

  let chainContext: string[] = request.chainContext ?? [];
  if (!request.skipCollaborationChain) {
    chainContext = await executeCollaborationChain(deps, def, request, chainContext);
  }

  return executeSpecialistCore(deps, { ...request, chainContext }, resumeFromChild);
}

async function executeCollaborationChain(
  deps: OrchestratorDeps,
  def: SpecialistAgentDefinition,
  request: SpecialistExecuteRequest,
  chainContext: string[]
): Promise<string[]> {
  const prependChain = resolvePrependChainForPrimary(
    request.command,
    request.intent,
    def,
    deps.agentRegistry
  );
  if (!prependChain || prependChain.mode !== 'prepend') {
    return chainContext;
  }

  let context = [...chainContext];
  for (const step of prependChain.steps) {
    const stepResult = await chainHandoff(
      deps,
      {
        tenantId: request.tenantId,
        fromAgentKey: def.agentKey,
        toAgentKey: step.agentKey,
        intent: step.intent,
        command: step.command ?? request.command,
        context: request.contextSnippets,
        parentRunId: request.parentRunId,
        actorId: request.actorId,
      },
      request.onEvent
    );
    if (stepResult.narrative) {
      context = [...context, `[${step.agentKey} intel] ${stepResult.narrative}`];
    } else if (stepResult.error) {
      context = [
        ...context,
        `[${step.agentKey} warning] Chain step failed: ${stepResult.error} — continuing with ${def.agentKey}.`,
      ];
    }
  }
  return context;
}

export async function executeSpecialistCore(
  deps: OrchestratorDeps,
  request: SpecialistExecuteRequest,
  resumeFromChild: (input: ResumeFromChildInput) => Promise<ResumeFromChildResult>
): Promise<SpecialistExecuteResult> {
  if (!deps.specialistRunner) {
    return { narrative: request.handlerResult, error: 'Specialist runner not configured' };
  }

  const def =
    deps.agentRegistry.get(request.agentKey) ??
    deps.agentRegistry.resolve(request.intent, request.command);
  if (!def) {
    return { narrative: request.handlerResult, error: 'No specialist agent for intent' };
  }

  emitStreamEvent(request.onEvent, { type: 'agent_assigned', agentKey: def.agentKey });

  const chainContext: string[] = request.chainContext ?? [];

  const { handoffPackage, resumeToken } = deps.protocol.createRequest({
    parentRunId: request.parentRunId ?? crypto.randomUUID(),
    sourceAgentKey: DEFAULT_BRAIN_AGENT_KEY,
    targetAgentKey: def.agentKey,
    intent: request.intent,
    contextSummary: request.contextSnippets.join('\n').slice(0, 500),
  });

  const result = await deps.specialistRunner.runWithDefinition(def, {
    ...request,
    agentKey: def.agentKey,
    chainContext,
    handoffConstraints: handoffPackage.constraints,
    parentRunId: request.parentRunId,
    onEvent: wrapAgentEvent(request.onEvent, def.agentKey),
  });

  if (result.handoffPackage && request.parentRunId) {
    result.handoffPackage.delegationId = handoffPackage.delegationId;
    result.handoffPackage.resumeToken = resumeToken;
    const resume = await resumeFromChild({
      tenantId: request.tenantId,
      parentRunId: request.parentRunId,
      childRunId: result.agentRunId ?? '',
      handoffPackage: result.handoffPackage,
    });
    if (resume.contextBlock && deps.sharedMemoryBridge && isRunMemoryEnabled()) {
      await deps.sharedMemoryBridge.recordAgentCompletion({
        tenantId: request.tenantId,
        runId: request.parentRunId,
        agentKey: def.agentKey,
        narrative: result.narrative,
        resumeContextBlock: resume.contextBlock,
        onEvent: request.onEvent,
      });
    } else if (deps.sharedMemoryBridge && isRunMemoryEnabled()) {
      await deps.sharedMemoryBridge.recordAgentCompletion({
        tenantId: request.tenantId,
        runId: request.parentRunId,
        agentKey: def.agentKey,
        narrative: result.narrative,
        onEvent: request.onEvent,
      });
    }
  } else if (
    deps.sharedMemoryBridge &&
    request.parentRunId &&
    isRunMemoryEnabled() &&
    result.narrative
  ) {
    await deps.sharedMemoryBridge.recordAgentCompletion({
      tenantId: request.tenantId,
      runId: request.parentRunId,
      agentKey: def.agentKey,
      narrative: result.narrative,
      onEvent: request.onEvent,
    });
  }

  return result;
}