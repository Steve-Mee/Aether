export interface AgentRosterPort {
  findActiveAgentKeys(tenantId: string, since: Date): Promise<string[]>;

  groupProactiveByAgent(
    tenantId: string,
  ): Promise<Array<{ agentKey: string | null; count: number }>>;

  findExplainabilityAgentKeys(
    tenantId: string,
    since: Date,
  ): Promise<Array<{ agentKeys: string[] }>>;

  findLastRunByAgents(
    tenantId: string,
    agentKeys: string[],
  ): Promise<Array<{ agentKey: string; updatedAt: Date }>>;

  findProactiveForAgent(
    tenantId: string,
    agentKey: string,
    since: Date,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      title: string;
      summary: string | null;
      command: string;
      triggerId: string;
      status: string;
      createdAt: Date;
    }>
  >;

  findExplainabilityForAgent(
    tenantId: string,
    agentKey: string,
    since: Date,
    limit: number,
  ): Promise<
    Array<{
      id: string;
      sourceType: string;
      sourceId: string;
      summary: string;
      agentKeys: string[];
      createdAt: Date;
    }>
  >;
}
