export interface OrchestratorTaskContext {
  tenantId: string;
  actorId?: string;
  task: string;
  input: Record<string, unknown>;
}

export interface OrchestratorPort {
  execute(ctx: OrchestratorTaskContext): Promise<Record<string, unknown>>;
}
