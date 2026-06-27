import { Kafka, logLevel, type Consumer, type Producer, type SASLOptions } from 'kafkajs';
import { logger } from '../logging/logger';
import {
  getKafkaBrokers,
  BROKER_DLQ_TOPIC,
  getFederatedDeploymentId,
  isKafkaSslEnabled,
  getKafkaSaslConfig,
} from './messagingConfig';
import type { BrokerMessage, BrokerMessageHandler, MessageBrokerPort } from './MessageBrokerPort';

function buildKafkaClient(brokers = getKafkaBrokers()): Kafka {
  const sasl = getKafkaSaslConfig();
  const ssl = isKafkaSslEnabled();
  const clientId = `aether-${getFederatedDeploymentId()}-backend`;

  return new Kafka({
    clientId,
    brokers,
    logLevel: logLevel.ERROR,
    ssl: ssl ? { rejectUnauthorized: process.env.KAFKA_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined,
    sasl: sasl as SASLOptions | undefined,
  });
}

export class KafkaMessageBrokerAdapter implements MessageBrokerPort {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Consumer[] = [];

  constructor(brokers = getKafkaBrokers()) {
    this.kafka = buildKafkaClient(brokers);
  }

  private async getProducer(): Promise<Producer> {
    if (!this.producer) {
      this.producer = this.kafka.producer({ idempotent: true });
      await this.producer.connect();
    }
    return this.producer;
  }

  async produce(topic: string, message: BrokerMessage): Promise<void> {
    const producer = await this.getProducer();
    await producer.send({
      topic,
      messages: [
        {
          key: message.idempotencyKey ?? message.eventId,
          value: JSON.stringify(message),
        },
      ],
    });
  }

  async consume(
    topic: string,
    groupId: string,
    handler: BrokerMessageHandler
  ): Promise<{ stop: () => Promise<void> }> {
    const consumer = this.kafka.consumer({ groupId });
    this.consumers.push(consumer);
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const parsed = JSON.parse(message.value.toString()) as BrokerMessage;
          await handler(parsed);
        } catch (err) {
          logger.error('kafka_consumer_message_failed', {
            topic,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      },
    });

    return {
      stop: async () => {
        await consumer.disconnect();
      },
    };
  }

  async produceDlq(message: BrokerMessage, error: string): Promise<void> {
    await this.produce(BROKER_DLQ_TOPIC, {
      ...message,
      payload: { ...message.payload, dlqError: error },
    });
  }

  async disconnect(): Promise<void> {
    for (const consumer of this.consumers) {
      await consumer.disconnect().catch(() => undefined);
    }
    if (this.producer) {
      await this.producer.disconnect().catch(() => undefined);
    }
  }
}
