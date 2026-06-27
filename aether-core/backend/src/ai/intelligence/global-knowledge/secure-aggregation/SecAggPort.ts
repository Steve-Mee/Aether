export interface SecAggEnqueueInput {
  tenantId: string;
  category: string;
  metric: string;
  value: number;
}

export interface SecAggPort {
  enqueueMaskedUpdate(input: SecAggEnqueueInput): Promise<boolean>;
  finalizeReadyRounds(): Promise<number>;
}
