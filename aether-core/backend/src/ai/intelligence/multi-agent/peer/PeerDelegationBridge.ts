import type { AgentOrchestrator, ChainHandoffInput } from '../AgentSupervisorOrchestrator';
import type { AgentRegistry } from '../AgentRegistry';
import type { SpecialistExecuteRequest, SpecialistExecuteResult, PeerDelegationRequest } from '../types';
import type { AgentPeerPort } from './AgentPeerPort';
import type { AgentPeerJobPort } from './jobs/AgentPeerJobPort';
import { isMultiAgentDelegationEnabled } from '../delegationConfig';
import { isPeerDelegationEnabled } from './PeerDelegationGuard';
import { UnifiedPeerGuard } from './UnifiedPeerGuard';

export function isMailPeerEnabled(): boolean {
  return process.env.MULTI_AGENT_MAIL_PEER === 'true';
}

export function isSupplierPeerEnabled(): boolean {
  return process.env.MULTI_AGENT_SUPPLIER_PEER === 'true';
}

export function isPhysicalPeerEnabled(): boolean {
  return process.env.MULTI_AGENT_PHYSICAL_PEER === 'true';
}

export function isNegotiationPeerEnabled(): boolean {
  return process.env.MULTI_AGENT_NEGOTIATION_PEER === 'true';
}

export function isInventoryPeerEnabled(): boolean {
  return process.env.MULTI_AGENT_INVENTORY_PEER === 'true';
}

export function isAutonomyPeerEnabled(): boolean {
  return process.env.MULTI_AGENT_AUTONOMY_PEER === 'true';
}

export class PeerDelegationBridge {
  private guard?: UnifiedPeerGuard;

  constructor(
    private orchestrator?: AgentOrchestrator,
    private peerBus?: AgentPeerPort,
    private jobPort?: AgentPeerJobPort,
    registry?: AgentRegistry
  ) {
    if (registry) {
      this.guard = new UnifiedPeerGuard(registry);
    }
  }

  isAvailable(): boolean {
    return isMultiAgentDelegationEnabled() && Boolean(this.orchestrator);
  }

  async runSpecialist(input: SpecialistExecuteRequest): Promise<SpecialistExecuteResult> {
    if (!this.orchestrator) {
      return { narrative: '', error: 'Agent orchestrator not available' };
    }
    if (this.guard && input.peerSourceAgentKey) {
      const validation = this.guard.validatePeerSourceRun(
        input.peerSourceAgentKey,
        input.agentKey,
        input.intent
      );
      if (!validation.ok) {
        return { narrative: '', error: validation.error };
      }
    }
    return this.orchestrator.executeSpecialist(input);
  }

  async chainHandoff(
    input: ChainHandoffInput,
    onEvent?: SpecialistExecuteRequest['onEvent']
  ): Promise<SpecialistExecuteResult> {
    if (!this.orchestrator) {
      return { narrative: '', error: 'Agent orchestrator not available' };
    }
    if (this.guard) {
      const validation = this.guard.validateChainHandoff(input);
      if (!validation.ok) {
        return { narrative: '', error: validation.error };
      }
    }
    return this.orchestrator.chainHandoff(input, onEvent);
  }

  async delegateAsync(request: PeerDelegationRequest): Promise<{ jobId: string } | { error: string }> {
    if (!this.peerBus || !this.jobPort || !isPeerDelegationEnabled()) {
      return { error: 'Async peer delegation not available' };
    }
    const validation = this.peerBus.validatePeerRequest?.(request);
    if (validation && !validation.ok) {
      return { error: validation.error ?? 'Peer validation failed' };
    }
    const job = await this.jobPort.enqueue({
      tenantId: request.tenantId,
      parentRunId: request.parentRunId,
      sourceAgentKey: request.sourceAgentKey,
      targetAgentKey: request.targetAgentKey,
      intent: request.intent,
      query: request.query,
      actorId: request.actorId,
      depth: request.depth,
    });
    return { jobId: job.id };
  }
}
