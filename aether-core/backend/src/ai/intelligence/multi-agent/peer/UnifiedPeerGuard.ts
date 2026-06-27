import { isMutatingIntent } from '../../command-brain/BrainActionPolicyResolver';
import type { AgentRegistry } from '../AgentRegistry';
import { getAllowedDelegationTargets, isMultiAgentDelegationEnabled } from '../delegationConfig';
import type { PeerDelegationRequest } from '../types';
import type { ChainHandoffInput } from '../AgentSupervisorOrchestrator';
import { GLOBAL_ADVISORY_AGENT_KEY } from './FederatedPeerPort';
import { FEDERATED_SANDBOX_PREFIX } from './federated/FederatedExecutionGate';

export function isPeerDelegationEnabled(): boolean {
  if (process.env.MULTI_AGENT_PEER_DELEGATION === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.MULTI_AGENT_PEER_DELEGATION !== 'true') {
    return false;
  }
  return isMultiAgentDelegationEnabled();
}

export function peerMaxDepth(): number {
  const raw = process.env.MULTI_AGENT_PEER_MAX_DEPTH;
  const n = raw ? Number(raw) : 2;
  return Number.isFinite(n) && n > 0 ? n : 2;
}

export interface PeerGuardResult {
  ok: boolean;
  error?: string;
}

/** Unified guard for AgentPeerBus, AgentPeerMesh, and PeerDelegationBridge. */
export class UnifiedPeerGuard {
  constructor(private registry: AgentRegistry) {}

  validatePeerDelegation(request: PeerDelegationRequest): PeerGuardResult {
    if (!isPeerDelegationEnabled()) {
      return { ok: false, error: 'Peer delegation is disabled' };
    }

    if (request.depth >= peerMaxDepth()) {
      return { ok: false, error: `Peer delegation depth limit (${peerMaxDepth()}) reached` };
    }

    if (request.targetAgentKey === GLOBAL_ADVISORY_AGENT_KEY) {
      return { ok: true };
    }

    if (request.targetAgentKey.startsWith(FEDERATED_SANDBOX_PREFIX)) {
      return { ok: true };
    }

    return this.validateLocalTarget(
      request.sourceAgentKey,
      request.targetAgentKey,
      request.intent
    );
  }

  validateChainHandoff(input: ChainHandoffInput): PeerGuardResult {
    if (!isPeerDelegationEnabled()) {
      return { ok: true };
    }

    const depth = input.peerDepth ?? 0;
    if (depth >= peerMaxDepth()) {
      return { ok: false, error: `Peer delegation depth limit (${peerMaxDepth()}) reached` };
    }

    return this.validateLocalTarget(input.fromAgentKey, input.toAgentKey, input.intent);
  }

  private validateLocalTarget(
    sourceAgentKey: string,
    targetAgentKey: string,
    intent: string
  ): PeerGuardResult {
    const allowed = getAllowedDelegationTargets();
    if (!allowed.has(targetAgentKey)) {
      return { ok: false, error: `Target agent ${targetAgentKey} is not allowed` };
    }

    const sourceDef = this.registry.resolveByKey(sourceAgentKey);
    if (!sourceDef) {
      return { ok: false, error: `Unknown source agent ${sourceAgentKey}` };
    }

    if (!sourceDef.canDelegateTo?.includes(targetAgentKey)) {
      return {
        ok: false,
        error: `${sourceAgentKey} cannot delegate to ${targetAgentKey}`,
      };
    }

    if (isMutatingIntent(intent)) {
      return {
        ok: false,
        error: `Mutating intent ${intent} cannot be executed via peer delegation — use approval flow`,
      };
    }

    const targetDef = this.registry.resolveByKey(targetAgentKey);
    if (!targetDef) {
      return { ok: false, error: `Unknown target agent ${targetAgentKey}` };
    }

    if (!targetDef.supportedIntents.includes(intent)) {
      return {
        ok: false,
        error: `Intent ${intent} is not supported by ${targetAgentKey}`,
      };
    }

    return { ok: true };
  }
}
