import type { RunWorkingMemoryPort } from '../memory/RunWorkingMemoryPort';

export interface NegotiationRoundState {
  negotiationId: string;
  round: number;
  lastDecision?: string;
  lastOffer?: number;
  status: 'active' | 'accepted' | 'rejected' | 'max_rounds';
}

export class NegotiationRoundStore {
  constructor(private runMemory: RunWorkingMemoryPort) {}

  private key(negotiationId: string): string {
    return `round:${negotiationId}`;
  }

  async getRound(
    tenantId: string,
    runId: string,
    negotiationId: string
  ): Promise<NegotiationRoundState | null> {
    const value = await this.runMemory.get(tenantId, runId, 'negotiation', this.key(negotiationId));
    return value as NegotiationRoundState | null;
  }

  async saveRound(
    tenantId: string,
    runId: string,
    state: NegotiationRoundState,
    updatedByAgentKey: string
  ): Promise<void> {
    await this.runMemory.set({
      tenantId,
      runId,
      namespace: 'negotiation',
      key: this.key(state.negotiationId),
      value: state,
      updatedByAgentKey,
    });
  }
}
