import { orchestrator, type AgentTask } from './Orchestrator';
import type { OrchestratorPort, OrchestratorTaskContext } from './OrchestratorPort';

export class OrchestratorAdapter implements OrchestratorPort {
  async execute(ctx: OrchestratorTaskContext): Promise<Record<string, unknown>> {
    const result = await orchestrator.execute({
      tenantId: ctx.tenantId,
      actorId: ctx.actorId,
      task: ctx.task as AgentTask,
      input: ctx.input,
    });
    return result.output;
  }
}

export const defaultOrchestratorPort = new OrchestratorAdapter();
