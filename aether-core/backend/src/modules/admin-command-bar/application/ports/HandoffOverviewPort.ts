export interface HandoffOverviewPort {
  findReflectionHandoffs(
    tenantId: string,
    since: Date,
    limit: number
  ): Promise<
    Array<{
      id: string;
      summary: string;
      createdAt: Date;
      fromAgentKey: string;
      toAgentKey: string;
      parentRunId: string | null;
    }>
  >;
  findPeerJobs(
    tenantId: string,
    since: Date,
    limit: number
  ): Promise<
    Array<{
      id: string;
      fromAgentKey: string;
      toAgentKey: string;
      status: string;
      createdAt: Date;
      completedAt: Date | null;
      updatedAt: Date;
      intent: string | null;
      resultPayload: string | null;
      query: string;
      parentRunId: string | null;
    }>
  >;
}
