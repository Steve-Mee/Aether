export function isAsyncPeerEnabled(): boolean {
  if (process.env.MULTI_AGENT_ASYNC_PEER === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.MULTI_AGENT_ASYNC_PEER !== 'true') {
    return false;
  }
  return process.env.MULTI_AGENT_ASYNC_PEER === 'true';
}

export function resolveAsyncPeerPollMs(): number {
  const raw = process.env.MULTI_AGENT_ASYNC_PEER_POLL_MS;
  const parsed = raw ? Number.parseInt(raw, 10) : 2000;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2000;
}
