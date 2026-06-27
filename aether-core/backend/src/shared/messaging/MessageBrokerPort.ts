import type { DomainEventPayload, DomainEventType } from '../events/eventBus';

export interface BrokerMessage {
  eventId: string;
  tenantId: string;
  type: DomainEventType;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
}

export type BrokerMessageHandler = (message: BrokerMessage) => Promise<void>;

export interface MessageBrokerPort {
  produce(topic: string, message: BrokerMessage): Promise<void>;
  consume(
    topic: string,
    groupId: string,
    handler: BrokerMessageHandler
  ): Promise<{ stop: () => Promise<void> }>;
  produceDlq(message: BrokerMessage, error: string): Promise<void>;
}
