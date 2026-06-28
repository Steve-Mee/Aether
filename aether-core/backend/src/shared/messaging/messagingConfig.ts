export type MessageBrokerType = 'none' | 'kafka';
export type EventBusMode = 'inprocess' | 'dual' | 'kafka';

/** Active external message broker (Kafka-only in Phase 10). */
export function getMessageBrokerType(): MessageBrokerType {
  const raw = process.env.MESSAGE_BROKER;
  if (raw === 'kafka') return 'kafka';
  if (raw === 'none') return 'none';
  // Backwards compatibility with Phase 9 env
  if (process.env.KAFKA_ENABLED === 'true') return 'kafka';
  return 'none';
}

export function isExternalBrokerEnabled(): boolean {
  return getMessageBrokerType() === 'kafka';
}

/** @deprecated Use isExternalBrokerEnabled() */
export function isKafkaEnabled(): boolean {
  return isExternalBrokerEnabled();
}

export function getEventBusMode(): EventBusMode {
  const raw = process.env.EVENT_BUS_MODE ?? 'inprocess';
  if (raw === 'dual' || raw === 'kafka') return raw;
  return 'inprocess';
}

export function getKafkaBrokers(): string[] {
  const raw = process.env.KAFKA_BROKERS ?? 'localhost:9092';
  return raw.split(',').map((b) => b.trim()).filter(Boolean);
}

export function resolveOutboxRelayPollMs(): number {
  const raw = process.env.OUTBOX_RELAY_POLL_MS;
  const n = raw ? Number.parseInt(raw, 10) : 1000;
  return Number.isFinite(n) && n > 0 ? n : 1000;
}

/** Domain event types routed via broker consumer instead of in-process dispatch when mode=kafka. */
export const BROKER_CONSUMER_EVENT_TYPES = new Set([
  'agent.peer.requested',
  'federated.execute.requested',
]);

/** @deprecated Use BROKER_CONSUMER_EVENT_TYPES */
export const KAFKA_CONSUMER_EVENT_TYPES = BROKER_CONSUMER_EVENT_TYPES;

export function domainEventTopic(type: string): string {
  return `aether.domain.${type.replace(/\./g, '_')}`;
}

export const BROKER_DLQ_TOPIC = 'aether.domain.dlq';

/** @deprecated Use BROKER_DLQ_TOPIC */
export const KAFKA_DLQ_TOPIC = BROKER_DLQ_TOPIC;

export const PEER_WORKER_GROUP_ID = 'aether-peer-workers';
export const FEDERATED_WORKER_GROUP_ID = 'aether-federated-workers';

export const FEDERATED_EXECUTE_TOPIC =
  process.env.FEDERATED_EXECUTE_TOPIC ?? 'aether.federated.execute';
export const FEDERATED_EXECUTE_RESPONSE_TOPIC =
  process.env.FEDERATED_EXECUTE_RESPONSE_TOPIC ?? 'aether.federated.execute.response';

export function shouldSkipInProcessDispatch(eventType: string): boolean {
  if (!isExternalBrokerEnabled()) return false;
  if (getEventBusMode() !== 'kafka') return false;
  return BROKER_CONSUMER_EVENT_TYPES.has(eventType);
}

export function isFederatedRpcEnabled(): boolean {
  return process.env.FEDERATED_RPC_ENABLED === 'true' && isExternalBrokerEnabled();
}

export function getFederatedDeploymentId(): string {
  return process.env.FEDERATED_DEPLOYMENT_ID ?? 'local';
}

export type OutboxRelayOwner = 'api' | 'peer-worker' | 'federated-worker' | 'none';

export function getOutboxRelayOwner(): OutboxRelayOwner {
  const raw = process.env.OUTBOX_RELAY_OWNER ?? 'api';
  if (raw === 'peer-worker' || raw === 'federated-worker' || raw === 'none') return raw;
  return 'api';
}

export function shouldRunOutboxRelay(role: OutboxRelayOwner): boolean {
  if (!isExternalBrokerEnabled()) return false;
  const owner = getOutboxRelayOwner();
  if (owner === 'none') return false;
  return owner === role;
}

export function isKafkaSslEnabled(): boolean {
  return process.env.KAFKA_SSL_ENABLED === 'true';
}

export function getKafkaSaslConfig(): {
  mechanism: 'plain' | 'scram-sha-256' | 'scram-sha-512';
  username: string;
  password: string;
} | null {
  const mechanism = process.env.KAFKA_SASL_MECHANISM;
  const username = process.env.KAFKA_SASL_USERNAME;
  const password = process.env.KAFKA_SASL_PASSWORD;
  if (!mechanism || !username || !password) return null;
  if (mechanism === 'scram-sha-256' || mechanism === 'scram-sha-512') {
    return { mechanism, username, password };
  }
  return { mechanism: 'plain', username, password };
}
