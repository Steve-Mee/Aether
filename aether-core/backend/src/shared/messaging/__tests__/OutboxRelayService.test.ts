import { OutboxRelayService } from '../OutboxRelayService';
import type { MessageBrokerPort, BrokerMessage } from '../MessageBrokerPort';

jest.mock('../../prisma/client', () => ({
  prisma: {
    $transaction: jest.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        $queryRaw: jest.fn().mockResolvedValue([]),
      })
    ),
    domainEvent: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '../../prisma/client';

describe('OutboxRelayService', () => {
  const prevBroker = process.env.MESSAGE_BROKER;

  beforeEach(() => {
    process.env.MESSAGE_BROKER = 'kafka';
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.MESSAGE_BROKER = prevBroker;
  });

  it('returns 0 when kafka disabled', async () => {
    process.env.MESSAGE_BROKER = 'none';
    const broker: MessageBrokerPort = {
      produce: jest.fn(),
      consume: jest.fn(),
      produceDlq: jest.fn(),
    };
    const relay = new OutboxRelayService(broker);
    await expect(relay.relayBatch()).resolves.toBe(0);
    expect(broker.produce).not.toHaveBeenCalled();
  });

  it('returns 0 when no rows claimed', async () => {
    const broker: MessageBrokerPort = {
      produce: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn(),
      produceDlq: jest.fn(),
    };
    const relay = new OutboxRelayService(broker);
    const count = await relay.relayBatch(10);
    expect(count).toBe(0);
    expect(broker.produce).not.toHaveBeenCalled();
  });

  it('produces claimed events when broker is wired', async () => {
    (prisma.$transaction as jest.Mock).mockImplementation(async (fn) =>
      fn({
        $queryRaw: jest.fn().mockResolvedValue([{ id: 'evt_1' }]),
      })
    );
    (prisma.domainEvent.findUnique as jest.Mock).mockResolvedValue({
      id: 'evt_1',
      tenantId: 't1',
      type: 'agent.peer.requested',
      payload: JSON.stringify({ jobId: 'j1' }),
      idempotencyKey: 'key1',
      relayedAt: null,
    });
    (prisma.domainEvent.update as jest.Mock).mockResolvedValue({});

    const broker: MessageBrokerPort = {
      produce: jest.fn().mockResolvedValue(undefined),
      consume: jest.fn(),
      produceDlq: jest.fn(),
    };
    const relay = new OutboxRelayService(broker);
    const count = await relay.relayBatch(10);
    expect(count).toBe(1);
    expect(broker.produce).toHaveBeenCalledTimes(1);
  });
});
