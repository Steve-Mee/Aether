export interface FederatedHivePort {
  runBatch(tenantId: string): Promise<{ categories: Record<string, number>; insightCount: number }>;
}
