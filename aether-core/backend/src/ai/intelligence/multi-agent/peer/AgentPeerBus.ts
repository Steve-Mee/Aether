import { prisma } from '../../../../shared/prisma/client';
import { emitStreamEvent } from '../../command-brain/AgentStreamEvents';
import { isDirectPeerEnabled } from '../parallelConfig';
import type { AgentOrchestrator } from '../AgentSupervisorOrchestrator';
import type { AgentRegistry } from '../AgentRegistry';
import type { PeerDelegationRequest, PeerDelegationResult } from '../types';
import type { AgentPeerPort } from './AgentPeerPort';
import {
  FederatedPeerPort,
  GLOBAL_ADVISORY_AGENT_KEY,
} from './FederatedPeerPort';
import {
  FederatedExecutionPort,
} from './federated/FederatedExecutionPort';
import { FEDERATED_SANDBOX_PREFIX, parseFederatedSandboxKey } from './federated/FederatedExecutionGate';
import { buildChainHandoffReason, humanizeHandoffReason } from './handoffReason';
import { AgentPeerMesh } from './AgentPeerMesh';
import { PeerDelegationGuard, type PeerGuardResult } from './PeerDelegationGuard';
import { PeerHandoffAuditLog } from './PeerHandoffAuditLog';

export class AgentPeerBus implements AgentPeerPort {
  private guard: PeerDelegationGuard;
  private audit = new PeerHandoffAuditLog();

  constructor(
    private registry: AgentRegistry,
    private orchestrator: AgentOrchestrator,
    private federatedPeer?: FederatedPeerPort,
    private federatedExecution?: FederatedExecutionPort,
    private mesh?: AgentPeerMesh
  ) {
    this.guard = new PeerDelegationGuard(registry);
  }

  validatePeerRequest(request: PeerDelegationRequest): PeerGuardResult {
    return this.guard.validate(request);
  }

  async requestPeerHandoff(request: PeerDelegationRequest): Promise<PeerDelegationResult> {
    const validation = this.guard.validate(request);
    if (!validation.ok) {
      return { success: false, error: validation.error };
    }

    if (request.targetAgentKey === GLOBAL_ADVISORY_AGENT_KEY) {
      return this.requestFederatedAdvisory(request);
    }

    if (request.targetAgentKey.startsWith(FEDERATED_SANDBOX_PREFIX)) {
      return this.requestFederatedSandbox(request);
    }

    if (isDirectPeerEnabled() && this.mesh) {
      return this.mesh.requestDirectHandoff(request);
    }

    const started = Date.now();
    try {
      emitStreamEvent(request.onEvent, {
        type: 'agent_handoff',
        fromAgentKey: request.sourceAgentKey,
        toAgentKey: request.targetAgentKey,
        handoffReason: humanizeHandoffReason(buildChainHandoffReason(request.intent)),
        handoffMode: 'orchestrated',
      });

      const result = await this.orchestrator.chainHandoff(
        {
          tenantId: request.tenantId,
          fromAgentKey: request.sourceAgentKey,
          toAgentKey: request.targetAgentKey,
          intent: request.intent,
          command: request.query,
          context: [],
          parentRunId: request.parentRunId,
          actorId: request.actorId,
          peerDepth: request.depth + 1,
          abortSignal: request.abortSignal,
        },
        request.onEvent
      );

      await this.audit.record({
        tenantId: request.tenantId,
        sourceAgentKey: request.sourceAgentKey,
        targetAgentKey: request.targetAgentKey,
        intent: request.intent,
        mode: 'orchestrated',
        success: !result.error,
        latencyMs: Date.now() - started,
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
      const message = err instanceof Error ? err.message : 'Peer delegation failed';
      return { success: false, error: message };
    }
  }

  private async requestFederatedAdvisory(
    request: PeerDelegationRequest
  ): Promise<PeerDelegationResult> {
    if (!this.federatedPeer) {
      return { success: false, error: 'Federated advisory is not configured' };
    }

    emitStreamEvent(request.onEvent, {
      type: 'agent_handoff',
      fromAgentKey: request.sourceAgentKey,
      toAgentKey: GLOBAL_ADVISORY_AGENT_KEY,
      handoffReason: humanizeHandoffReason('global-advisory'),
    });

    const advisory = await this.federatedPeer.requestAdvisory({
      tenantId: request.tenantId,
      sourceAgentKey: request.sourceAgentKey,
      query: request.query,
      agentKey: request.sourceAgentKey,
    });

    if (!advisory.success) {
      return { success: false, error: advisory.error ?? 'Federated advisory failed' };
    }

    const narrative = [
      advisory.disclaimer,
      ...advisory.snippets.map((s) => `- ${s}`),
    ]
      .filter(Boolean)
      .join('\n');

    await this.auditFederatedHandoff(request, narrative.slice(0, 500));

    return { success: true, narrative };
  }

  private async requestFederatedSandbox(
    request: PeerDelegationRequest
  ): Promise<PeerDelegationResult> {
    if (!this.federatedExecution) {
      return { success: false, error: 'Federated execution sandbox is not configured' };
    }

    const capability = parseFederatedSandboxKey(request.targetAgentKey);
    if (!capability) {
      return { success: false, error: 'Invalid federated sandbox target' };
    }

    emitStreamEvent(request.onEvent, {
      type: 'agent_handoff',
      fromAgentKey: request.sourceAgentKey,
      toAgentKey: request.targetAgentKey,
      handoffReason: humanizeHandoffReason(`federated-sandbox:${capability}`),
    });

    const result = await this.federatedExecution.requestSandboxExecution({
      tenantId: request.tenantId,
      sourceAgentKey: request.sourceAgentKey,
      capability,
      queryHint: request.query,
    });

    if (!result.success) {
      return { success: false, error: result.error ?? 'Federated sandbox failed' };
    }

    const narrative = [result.disclaimer, result.summary].filter(Boolean).join('\n');
    return { success: true, narrative };
  }

  private async auditFederatedHandoff(
    request: PeerDelegationRequest,
    summary: string
  ): Promise<void> {
    try {
      await prisma.reflectionHandoffLog.create({
        data: {
          tenantId: request.tenantId,
          sourceAgentKey: request.sourceAgentKey,
          targetAgentKey: GLOBAL_ADVISORY_AGENT_KEY,
          reflectionIds: [],
          summary,
          parentRunId: request.parentRunId ?? null,
        },
      });
    } catch {
      // Audit is best-effort
    }
  }
}

export { buildChainHandoffReason };
