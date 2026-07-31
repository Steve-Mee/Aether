import { emitStreamEvent } from '../../command-brain/AgentStreamEvents';
import { wrapAgentEvent } from '../agentStreamWrap';
import { humanizeHandoffReason, buildChainHandoffReason } from '../peer/handoffReason';
import { peerContextToChainLine } from '../peer/AgentPeerMessage';
import type { AgentPeerMessage, SpecialistExecuteRequest, SpecialistExecuteResult } from '../types';

export interface ChainHandoffInput {
  tenantId: string;
  fromAgentKey: string;
  toAgentKey: string;
  intent: string;
  command: string;
  context: string[];
  parentRunId?: string;
  actorId?: string;
  peerDepth?: number;
  abortSignal?: AbortSignal;
  contextPayload?: AgentPeerMessage;
  correlationId?: string;
}
import type { OrchestratorDeps } from './orchestratorDeps';

export async function chainHandoff(
  deps: OrchestratorDeps,
  input: ChainHandoffInput,
  onEvent?: SpecialistExecuteRequest['onEvent']
): Promise<SpecialistExecuteResult> {
  const targetDef = deps.agentRegistry.resolveByKey(input.toAgentKey);
  if (!targetDef || !deps.specialistRunner) {
    return { narrative: '', error: `Cannot chain to agent ${input.toAgentKey}` };
  }

  emitStreamEvent(onEvent, { type: 'agent_assigned', agentKey: input.toAgentKey });
  emitStreamEvent(onEvent, {
    type: 'agent_handoff',
    fromAgentKey: input.fromAgentKey,
    toAgentKey: input.toAgentKey,
    handoffReason: humanizeHandoffReason(buildChainHandoffReason(input.intent)),
  });

  try {
    const started = Date.now();
    const chainContext = [...(input.context ?? [])];
    if (input.contextPayload) {
      chainContext.push(peerContextToChainLine(input.contextPayload));
    }

    const result = await deps.specialistRunner.runWithDefinition(targetDef, {
      tenantId: input.tenantId,
      agentKey: input.toAgentKey,
      intent: input.intent,
      command: input.command,
      contextSnippets: chainContext,
      handlerResult: `Chained from ${input.fromAgentKey}`,
      parentRunId: input.parentRunId,
      actorId: input.actorId,
      handoffConstraints: [`chainFrom:${input.fromAgentKey}`],
      onEvent: wrapAgentEvent(onEvent, input.toAgentKey),
      abortSignal: input.abortSignal,
      peerDepth: input.peerDepth ?? 0,
      correlationId: input.correlationId,
    });
    void deps.reflectionMetrics?.recordHandoffLatency(
      input.tenantId,
      Date.now() - started,
      input.parentRunId
    );
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Chain handoff failed';
    return { narrative: '', error: message };
  }
}
