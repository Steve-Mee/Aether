import { UnifiedPeerGuard, isPeerDelegationEnabled, peerMaxDepth } from './UnifiedPeerGuard';
import type { AgentRegistry } from '../AgentRegistry';
import type { PeerDelegationRequest } from '../types';
import type { PeerGuardResult } from './UnifiedPeerGuard';

export { isPeerDelegationEnabled, peerMaxDepth };
export type { PeerGuardResult };

export class PeerDelegationGuard {
  private unified: UnifiedPeerGuard;

  constructor(registry: AgentRegistry) {
    this.unified = new UnifiedPeerGuard(registry);
  }

  validate(request: PeerDelegationRequest): PeerGuardResult {
    return this.unified.validatePeerDelegation(request);
  }
}
