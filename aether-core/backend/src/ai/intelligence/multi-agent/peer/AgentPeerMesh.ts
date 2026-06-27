import { emitStreamEvent } from '../../command-brain/AgentStreamEvents';
import type { AgentRegistry } from '../AgentRegistry';
import type { SpecialistAgentRunner } from '../SpecialistAgentRunner';
import { wrapAgentEvent } from '../agentStreamWrap';
import type { PeerDelegationRequest, PeerDelegationResult } from '../types';
import { buildChainHandoffReason, humanizeHandoffReason } from './handoffReason';
import { PeerHandoffAuditLog } from './PeerHandoffAuditLog';
import { UnifiedPeerGuard } from './UnifiedPeerGuard';

export class AgentPeerMesh {
  private guard: UnifiedPeerGuard;

  constructor(
    private registry: AgentRegistry,
    private specialistRunner: SpecialistAgentRunner,
    registryForGuard: AgentRegistry,
    private audit: PeerHandoffAuditLog = new PeerHandoffAuditLog()
  ) {
    this.guard = new UnifiedPeerGuard(registryForGuard);
  }

  validatePeerRequest(request: PeerDelegationRequest) {
    return this.guard.validatePeerDelegation(request);
  }

  async requestDirectHandoff(request: PeerDelegationRequest): Promise<PeerDelegationResult> {
    const validation = this.guard.validatePeerDelegation(request);
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    const targetDef = this.registry.resolveByKey(request.targetAgentKey);
    if (!targetDef) {
      return { success: false, error: `Unknown target agent ${request.targetAgentKey}` };
    }

    emitStreamEvent(request.onEvent, {
      type: 'agent_handoff',
      fromAgentKey: request.sourceAgentKey,
      toAgentKey: request.targetAgentKey,
      handoffReason: humanizeHandoffReason(buildChainHandoffReason(request.intent)),
      handoffMode: 'direct',
    });

    const started = Date.now();
    try {
      const result = await this.specialistRunner.runWithDefinition(targetDef, {
        tenantId: request.tenantId,
        agentKey: request.targetAgentKey,
        intent: request.intent,
        command: request.query,
        contextSnippets: [],
        handlerResult: `Direct peer handoff from ${request.sourceAgentKey}`,
        parentRunId: request.parentRunId,
        actorId: request.actorId,
        onEvent: wrapAgentEvent(request.onEvent, request.targetAgentKey),
        abortSignal: request.abortSignal,
        peerDepth: request.depth + 1,
        handoffConstraints: [`peerFrom:${request.sourceAgentKey}`],
      });

      const latencyMs = Date.now() - started;
      await this.audit.record({
        tenantId: request.tenantId,
        sourceAgentKey: request.sourceAgentKey,
        targetAgentKey: request.targetAgentKey,
        intent: request.intent,
        mode: 'direct',
        success: !result.error,
        latencyMs,
        parentRunId: request.parentRunId,
        agentRunId: result.agentRunId,
        error: result.error,
      });

      if (result.error) {
        return { success: false, error: result.error, agentRunId: result.agentRunId };
      }

      return {
        success: true,
        narrative: result.narrative,
        agentRunId: result.agentRunId,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Direct peer handoff failed';
      await this.audit.record({
        tenantId: request.tenantId,
        sourceAgentKey: request.sourceAgentKey,
        targetAgentKey: request.targetAgentKey,
        intent: request.intent,
        mode: 'direct',
        success: false,
        latencyMs: Date.now() - started,
        parentRunId: request.parentRunId,
        error: message,
      });
      return { success: false, error: message };
    }
  }
}
