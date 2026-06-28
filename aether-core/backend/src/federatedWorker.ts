import { createMessageBroker } from './shared/messaging/createMessageBroker';
import {
  FEDERATED_EXECUTE_TOPIC,
  FEDERATED_WORKER_GROUP_ID,
  resolveOutboxRelayPollMs,
} from './shared/messaging/messagingConfig';
import { OutboxRelayService, setOutboxRelayService, startOutboxRelayInterval } from './shared/messaging/OutboxRelayService';
import { logger } from './shared/logging/logger';
import { disconnectPrisma, prisma } from './shared/prisma/client';
import { bootstrapApplication, getCompositionRoot } from './bootstrap/compositionRoot';
import type { FederatedAgentRequest } from './ai/intelligence/multi-agent/peer/federated/types';
import type { BrokerMessage } from './shared/messaging/MessageBrokerPort';

const MAX_RETRIES = 3;

async function isRequestAlreadyProcessed(requestId: string): Promise<boolean> {
  const row = await prisma.federatedExecutionAudit.findUnique({
    where: { requestId },
    select: { id: true },
  });
  return row != null;
}

async function runFederatedWorker(): Promise<void> {
  bootstrapApplication();
  const broker = createMessageBroker();
  setOutboxRelayService(new OutboxRelayService(broker));
  const stopRelay = startOutboxRelayInterval(resolveOutboxRelayPollMs(), 'federated-worker');

  const root = getCompositionRoot();
  const worker = root.federatedExecutionWorker;
  if (!worker) {
    logger.error('federated_worker_not_wired');
    process.exit(1);
  }

  const { stop: stopConsumer } = await broker.consume(
    FEDERATED_EXECUTE_TOPIC,
    FEDERATED_WORKER_GROUP_ID,
    async (message: BrokerMessage) => {
      const request = message.payload as unknown as FederatedAgentRequest;
      if (await isRequestAlreadyProcessed(request.requestId)) {
        logger.info('federated_worker_skip_processed', { requestId: request.requestId });
        return;
      }

      let attempt = 0;
      while (attempt < MAX_RETRIES) {
        try {
          const response = await worker.handleRequest(request);
          await worker.publishResponse(response, message.tenantId);
          return;
        } catch (err) {
          attempt += 1;
          if (attempt >= MAX_RETRIES) {
            await broker.produceDlq(message, err instanceof Error ? err.message : String(err));
            logger.error('federated_worker_dlq', { eventId: message.eventId, attempt });
          } else {
            await new Promise((r) => setTimeout(r, 500 * attempt));
          }
        }
      }
    }
  );

  logger.info('federated_worker_started', {
    topic: FEDERATED_EXECUTE_TOPIC,
    group: FEDERATED_WORKER_GROUP_ID,
  });

  const shutdown = async () => {
    stopRelay();
    await stopConsumer();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown());
  process.on('SIGINT', () => void shutdown());
}

void runFederatedWorker();

export {};
