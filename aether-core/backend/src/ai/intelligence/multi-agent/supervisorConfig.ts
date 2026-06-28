export function isSupervisorModeEnabled(): boolean {
  if (process.env.MULTI_AGENT_SUPERVISOR_MODE === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.MULTI_AGENT_SUPERVISOR_MODE !== 'true') {
    return false;
  }
  return true;
}

export function isPromotionPeerEnabled(): boolean {
  return process.env.MULTI_AGENT_PROMOTION_PEER === 'true';
}

export function isNegotiationAutoLoopEnabled(): boolean {
  return process.env.MULTI_AGENT_NEGOTIATION_AUTO_LOOP === 'true';
}
