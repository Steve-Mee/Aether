import { isAsyncPeerEnabled, resolveAsyncPeerPollMs } from './asyncPeerConfig';
import { getEventBusMode, isExternalBrokerEnabled, resolveOutboxRelayPollMs } from '../../../../../shared/messaging/messagingConfig';
import type { AgentPeerJobPort } from './AgentPeerJobPort';

/** Poll pending AgentPeerJob rows when Kafka is down (fallback). */
export async function pollPendingPeerJobs(
  jobPort: AgentPeerJobPort,
  processJob: (jobId: string, tenantId: string) => Promise<void>
): Promise<number> {
  if (!isAsyncPeerEnabled()) return 0;
  if (isExternalBrokerEnabled() && getEventBusMode() === 'kafka') return 0;

  let processed = 0;
  for (let i = 0; i < 10; i++) {
    const job = await jobPort.claimNext();
    if (!job) break;
    await processJob(job.id, job.tenantId);
    processed += 1;
  }
  return processed;
}

export function resolvePeerJobPollMs(): number {
  return resolveAsyncPeerPollMs() || resolveOutboxRelayPollMs();
}
