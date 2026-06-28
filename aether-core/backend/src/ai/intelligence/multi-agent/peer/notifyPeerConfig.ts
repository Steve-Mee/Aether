export function isNotifyPeerEnabled(): boolean {
  if (process.env.MULTI_AGENT_NOTIFY_PEER === 'false') return false;
  if (process.env.NODE_ENV === 'production' && process.env.MULTI_AGENT_NOTIFY_PEER !== 'true') {
    return false;
  }
  return true;
}
