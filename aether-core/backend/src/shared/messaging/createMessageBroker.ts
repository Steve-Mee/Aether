import { isExternalBrokerEnabled } from './messagingConfig';
import { InMemoryMessageBrokerAdapter } from './InProcessMessageBrokerAdapter';
import { KafkaMessageBrokerAdapter } from './KafkaMessageBrokerAdapter';
import { NoOpMessageBrokerAdapter } from './InProcessMessageBrokerAdapter';
import type { MessageBrokerPort } from './MessageBrokerPort';

export function createMessageBroker(): MessageBrokerPort {
  if (!isExternalBrokerEnabled()) {
    return new NoOpMessageBrokerAdapter();
  }
  try {
    return new KafkaMessageBrokerAdapter();
  } catch {
    return new NoOpMessageBrokerAdapter();
  }
}

export function createInMemoryMessageBroker(): InMemoryMessageBrokerAdapter {
  return new InMemoryMessageBrokerAdapter();
}
