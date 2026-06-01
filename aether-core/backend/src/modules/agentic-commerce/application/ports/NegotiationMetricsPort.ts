export interface NegotiationMetricsRow {
  accept: number;
  counter: number;
  reject: number;
  llmUsed: number;
}

export interface NegotiationMetricsPort {
  getMetrics(tenantId: string): Promise<NegotiationMetricsRow | null>;
  recordDecision(
    tenantId: string,
    decision: 'ACCEPT' | 'COUNTER' | 'REJECT',
    llm?: boolean
  ): Promise<void>;
}
