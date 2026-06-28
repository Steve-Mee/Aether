import { NegotiationRoundStore } from '../NegotiationRoundStore';
import { createMockRunWorkingMemory } from '../../memory/__tests__/mockRunWorkingMemory';

describe('NegotiationRoundStore', () => {
  const memory = createMockRunWorkingMemory();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('persists round state under negotiation namespace', async () => {
    const store = new NegotiationRoundStore(memory);
    await store.saveRound(
      't1',
      'run-1',
      {
        negotiationId: 'neg-1',
        round: 2,
        lastDecision: 'COUNTER',
        lastOffer: 42,
        status: 'active',
      },
      'negotiation'
    );

    expect(memory.set).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        runId: 'run-1',
        namespace: 'negotiation',
        key: 'round:neg-1',
      })
    );
  });

  it('reads round state from memory', async () => {
    (memory.get as jest.Mock).mockResolvedValue({ round: 1, status: 'active' });
    const store = new NegotiationRoundStore(memory);
    const state = await store.getRound('t1', 'run-1', 'neg-1');
    expect(state).toEqual({ round: 1, status: 'active' });
  });
});
