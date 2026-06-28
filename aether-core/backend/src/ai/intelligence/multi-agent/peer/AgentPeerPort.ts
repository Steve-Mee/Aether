import type { PeerGuardResult } from './PeerDelegationGuard';
import type { PeerDelegationRequest, PeerDelegationResult } from '../types';

export interface AgentPeerPort {
  requestPeerHandoff(
    request: PeerDelegationRequest
  ): Promise<PeerDelegationResult>;
  validatePeerRequest?(request: PeerDelegationRequest): PeerGuardResult;
  enqueueAsyncPeer?(
    request: PeerDelegationRequest
  ): Promise<{ jobId: string; status: 'queued' } | { error: string }>;
}
