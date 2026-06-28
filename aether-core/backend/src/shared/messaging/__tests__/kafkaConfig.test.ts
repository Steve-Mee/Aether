import {
  domainEventTopic,
  getEventBusMode,
  isKafkaEnabled,
  shouldSkipInProcessDispatch,
} from '../kafkaConfig';

describe('kafkaConfig', () => {
  const prevKafka = process.env.KAFKA_ENABLED;
  const prevMode = process.env.EVENT_BUS_MODE;

  afterEach(() => {
    process.env.KAFKA_ENABLED = prevKafka;
    process.env.EVENT_BUS_MODE = prevMode;
  });

  it('defaults kafka off and inprocess mode', () => {
    delete process.env.KAFKA_ENABLED;
    delete process.env.EVENT_BUS_MODE;
    expect(isKafkaEnabled()).toBe(false);
    expect(getEventBusMode()).toBe('inprocess');
    expect(shouldSkipInProcessDispatch('agent.peer.requested')).toBe(false);
  });

  it('skips in-process dispatch for peer events in kafka mode', () => {
    process.env.KAFKA_ENABLED = 'true';
    process.env.EVENT_BUS_MODE = 'kafka';
    expect(shouldSkipInProcessDispatch('agent.peer.requested')).toBe(true);
    expect(shouldSkipInProcessDispatch('mail.processed')).toBe(false);
  });

  it('maps domain event types to kafka topics', () => {
    expect(domainEventTopic('agent.peer.requested')).toBe('aether.domain.agent_peer_requested');
  });
});
