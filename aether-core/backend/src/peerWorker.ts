import { createMessageBroker } from './shared/messaging/createMessageBroker';
import { domainEventTopic, PEER_WORKER_GROUP_ID, resolveOutboxRelayPollMs } from './shared/messaging/messagingConfig';
import { OutboxRelayService, setOutboxRelayService, startOutboxRelayInterval } from './shared/messaging/OutboxRelayService';
import { logger } from './shared/logging/logger';
import { disconnectPrisma } from './shared/prisma/client';
import { bootstrapApplication, getCompositionRoot } from './bootstrap/compositionRoot';
import { getAgentPeerJobWorker } from './ai/intelligence/multi-agent/peer/jobs/AgentPeerJobWorker';
import { prisma } from './shared/prisma/client';
import type { BrokerMessage } from './shared/messaging/MessageBrokerPort';

const MAX_RETRIES = 3;

async function isEventAlreadyProcessed(eventId: string): Promise<boolean> {
  const row = await prisma.domainEvent.findUnique({
    where: { id: eventId },
    select: { processedAt: true },
  });
  return row?.processedAt != null;
}

async function markEventProcessed(eventId: string): Promise<void> {
  await prisma.domainEvent.update({
    where: { id: eventId },
    data: { processedAt: new Date() },
  });
}

async function runPeerWorker(): Promise<void> {
  bootstrapApplication();
  const broker = createMessageBroker();
  setOutboxRelayService(new OutboxRelayService(broker));
  const stopRelay = startOutboxRelayInterval(resolveOutboxRelayPollMs(), 'peer-worker');

  const worker = getAgentPeerJobWorker();
  if (!worker) {
    logger.error('peer_worker_no_worker_instance');
    process.exit(1);
  }

  const topic = domainEventTopic('agent.peer.requested');
  const { stop: stopConsumer } = await broker.consume(
    topic,
    PEER_WORKER_GROUP_ID,
    async (message: BrokerMessage) => {
      if (await isEventAlreadyProcessed(message.eventId)) {
        logger.info('peer_worker_skip_processed', { eventId: message.eventId });
        return;
      }

      let attempt = 0;
      while (attempt < MAX_RETRIES) {
        try {
          await worker.handleRequestedEvent(message.payload, message.tenantId);
          await markEventProcessed(message.eventId);
          return;
        } catch (err) {
          attempt += 1;
          if (attempt >= MAX_RETRIES) {
            await broker.produceDlq(message, err instanceof Error ? err.message : String(err));
            logger.error('peer_worker_dlq', { eventId: message.eventId, attempt });
          } else {
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
        }
      }
    }
  );

  logger.info('peer_worker_started', { topic, group: PEER_WORKER_GROUP_ID });

  const shutdown = async () => {
    stopRelay();
    await stopConsumer();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

void runPeerWorker();

export {};
