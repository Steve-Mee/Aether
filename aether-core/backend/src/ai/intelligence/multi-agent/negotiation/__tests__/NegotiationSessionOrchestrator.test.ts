import { NegotiationSessionOrchestrator } from '../NegotiationSessionOrchestrator';
import { createMockRunWorkingMemory } from '../../memory/__tests__/mockRunWorkingMemory';

describe('NegotiationSessionOrchestrator', () => {
  const runMemory = createMockRunWorkingMemory();

  it('runs a round via RespondToOfferUseCase and stores round state', async () => {
    const respondToOffer = {
      execute: jest.fn().mockResolvedValue({
        decision: 'COUNTER',
        counterOffer: 55,
        status: 'IN_PROGRESS',
      }),
    };

    const orchestrator = new NegotiationSessionOrchestrator(respondToOffer, runMemory);
    const result = await orchestrator.runRound({
      tenantId: 't1',
      runId: 'run-1',
      negotiationId: 'neg-1',
      offer: 50,
    });

    expect(respondToOffer.execute).toHaveBeenCalled();
    expect(result.decision).toBe('COUNTER');
    expect(result.round).toBe(1);
    expect(result.terminal).toBe(false);
    expect(runMemory.set).toHaveBeenCalled();
  });

  it('marks terminal state on ACCEPT', async () => {
    const respondToOffer = {
      execute: jest.fn().mockResolvedValue({
        decision: 'ACCEPT',
        status: 'ACCEPTED',
      }),
    };

    const orchestrator = new NegotiationSessionOrchestrator(respondToOffer, runMemory);
    const result = await orchestrator.runRound({
      tenantId: 't1',
      runId: 'run-1',
      negotiationId: 'neg-2',
      offer: 40,
    });

    expect(result.terminal).toBe(true);
  });
});
