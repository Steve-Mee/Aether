import { logger } from '../logging/logger';
import type { BrokerMessage, BrokerMessageHandler, MessageBrokerPort } from './MessageBrokerPort';

/** No-op broker when Kafka is disabled — relay skips produce. */
export class NoOpMessageBrokerAdapter implements MessageBrokerPort {
  async produce(): Promise<void> {
    /* kafka disabled */
  }

  async consume(): Promise<{ stop: () => Promise<void> }> {
    return { stop: async () => undefined };
  }

  async produceDlq(message: BrokerMessage, error: string): Promise<void> {
    logger.warn('message_broker_dlq_noop', { eventId: message.eventId, error });
  }
}

/** In-memory broker for unit tests. */
export class InMemoryMessageBrokerAdapter implements MessageBrokerPort {
  private handlers = new Map<string, BrokerMessageHandler[]>();

  async produce(topic: string, message: BrokerMessage): Promise<void> {
    const list = this.handlers.get(topic) ?? [];
    for (const handler of list) {
      await handler(message);
    }
  }

  async consume(topic: string, _groupId: string, handler: BrokerMessageHandler): Promise<{ stop: () => Promise<void> }> {
    const list = this.handlers.get(topic) ?? [];
    list.push(handler);
    this.handlers.set(topic, list);
    return { stop: async () => undefined };
  }

  async produceDlq(message: BrokerMessage, error: string): Promise<void> {
    logger.info('inmemory_dlq', { eventId: message.eventId, error });
  }
}
