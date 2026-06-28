import { isMutatingIntent } from '../../command-brain/BrainActionPolicyResolver';
import type { AgentRegistry } from '../AgentRegistry';
import { getAllowedDelegationTargets, isMultiAgentDelegationEnabled, validatePeerPayloadScope } from '../delegationConfig';
import type { PeerDelegationRequest } from '../types';
import type { ChainHandoffInput } from '../AgentSupervisorOrchestrator';
import { GLOBAL_ADVISORY_AGENT_KEY } from './FederatedPeerPort';
import { FEDERATED_SANDBOX_PREFIX } from './federated/FederatedExecutionGate';
import type { MerchantSettings } from '../../../../shared/settings/merchantSettingsTypes';
import { resolveAutonomyCategoryKey } from '../../../../shared/policy/AutonomyActionRegistry';

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

/** Check whether the target agent's autonomy category is enabled for the merchant. */
export function validateAutonomyCategoryEnabled(
  settings: MerchantSettings,
  intent: string,
  targetAgentKey: string,
): PeerGuardResult {
  const category = resolveAutonomyCategoryKey({ intent, agentKey: targetAgentKey });
  if (!category) return { ok: true };
  const policy = settings.autonomyPrefs.actionCategories[category];
  if (policy && !policy.enabled) {
    return {
      ok: false,
      error: `Autonomie-categorie ${category} is uitgeschakeld — peer delegatie geblokkeerd`,
    };
  }
  return { ok: true };
}

/** Unified guard for AgentPeerBus, AgentPeerMesh, and PeerDelegationBridge. */
export class UnifiedPeerGuard {
  constructor(private registry: AgentRegistry) {}

  validatePeerDelegation(
    request: PeerDelegationRequest,
    settings?: MerchantSettings,
  ): PeerGuardResult {
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

    const payloadCheck = validatePeerPayloadScope(
      request.sourceAgentKey,
      request.targetAgentKey,
      request.contextPayload?.payload
    );
    if (!payloadCheck.ok) {
      return payloadCheck;
    }

    if (settings) {
      const categoryCheck = validateAutonomyCategoryEnabled(
        settings,
        request.intent,
        request.targetAgentKey,
      );
      if (!categoryCheck.ok) return categoryCheck;
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

    const payloadCheck = validatePeerPayloadScope(
      input.fromAgentKey,
      input.toAgentKey,
      input.contextPayload?.payload
    );
    if (!payloadCheck.ok) {
      return payloadCheck;
    }

    return this.validateLocalTarget(input.fromAgentKey, input.toAgentKey, input.intent);
  }

  validatePeerSourceRun(
    peerSourceAgentKey: string,
    targetAgentKey: string,
    intent: string,
    contextPayload?: import('../types').AgentPeerMessage
  ): PeerGuardResult {
    if (!isPeerDelegationEnabled()) {
      return { ok: true };
    }

    const payloadCheck = validatePeerPayloadScope(
      peerSourceAgentKey,
      targetAgentKey,
      contextPayload?.payload
    );
    if (!payloadCheck.ok) {
      return payloadCheck;
    }

    return this.validateLocalTarget(peerSourceAgentKey, targetAgentKey, intent);
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
