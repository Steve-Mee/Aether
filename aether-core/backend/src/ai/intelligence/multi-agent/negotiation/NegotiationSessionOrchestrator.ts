import type { RunWorkingMemoryPort } from '../memory/RunWorkingMemoryPort';
import { NegotiationRoundStore } from './NegotiationRoundStore';

export interface RespondToOfferPort {
  execute(
    negotiationId: string,
    params: { offer: number; agentId: string; parentRunId?: string },
    ctx: { tenantId: string; actorId?: string }
  ): Promise<{
    decision: string;
    counterOffer?: number;
    status: string;
  }>;
}

export interface NegotiationSessionInput {
  tenantId: string;
  runId: string;
  negotiationId: string;
  offer: number;
  actorId?: string;
}

export class NegotiationSessionOrchestrator {
  private roundStore: NegotiationRoundStore;

  constructor(
    private respondToOffer: RespondToOfferPort,
    runMemory: RunWorkingMemoryPort
  ) {
    this.roundStore = new NegotiationRoundStore(runMemory);
  }

  async runRound(input: NegotiationSessionInput): Promise<{
    decision: string;
    round: number;
    terminal: boolean;
    counterOffer?: number;
  }> {
    const result = await this.respondToOffer.execute(
      input.negotiationId,
      { offer: input.offer, agentId: input.actorId ?? 'negotiation-agent' },
      { tenantId: input.tenantId, actorId: input.actorId }
    );

    const prior = await this.roundStore.getRound(input.tenantId, input.runId, input.negotiationId);
    const round = (prior?.round ?? 0) + 1;
    const terminal =
      result.decision === 'ACCEPT' ||
      result.decision === 'REJECT' ||
      result.status === 'ACCEPTED' ||
      result.status === 'REJECTED';

    await this.roundStore.saveRound(
      input.tenantId,
      input.runId,
      {
        negotiationId: input.negotiationId,
        round,
        lastDecision: result.decision,
        lastOffer: result.counterOffer ?? input.offer,
        status: terminal
          ? result.decision === 'ACCEPT'
            ? 'accepted'
            : result.decision === 'REJECT'
              ? 'rejected'
              : 'max_rounds'
          : 'active',
      },
      'negotiation'
    );

    return {
      decision: result.decision,
      round,
      terminal,
      counterOffer: result.counterOffer,
    };
  }
}
