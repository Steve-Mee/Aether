import type { AgentBranchResult, ParallelSpecialistResult } from '../types';

export interface FallbackStrategy {
  continueOnError: boolean;
  minSuccessfulAgents: number;
  degradeGracefully: boolean;
}

export function getOrchestratorFallbackStrategy(): FallbackStrategy {
  const continueOnError = process.env.MULTI_AGENT_CONTINUE_ON_ERROR !== 'false';
  const minSuccessfulAgents = process.env.MULTI_AGENT_MIN_SUCCESSFUL
    ? Number(process.env.MULTI_AGENT_MIN_SUCCESSFUL)
    : 0;
  const degradeGracefully = process.env.MULTI_AGENT_DEGRADE_GRACEFULLY !== 'false';

  return {
    continueOnError,
    minSuccessfulAgents: Number.isFinite(minSuccessfulAgents) ? minSuccessfulAgents : 0,
    degradeGracefully,
  };
}

export function evaluateParallelExecution(
  result: ParallelSpecialistResult,
  strategy: FallbackStrategy
): {
  success: boolean;
  successCount: number;
  failureCount: number;
  shouldDegrade: boolean;
} {
  const successCount = result.results.filter(
    (r: AgentBranchResult) => r.status === 'completed' && !r.error
  ).length;
  const failureCount = result.results.filter(
    (r: AgentBranchResult) => r.status === 'failed' || r.error
  ).length;

  const success = successCount >= strategy.minSuccessfulAgents;
  const shouldDegrade =
    strategy.degradeGracefully && failureCount > 0 && successCount > 0;

  return {
    success,
    successCount,
    failureCount,
    shouldDegrade,
  };
}

export function buildDegradedNarrative(
  result: ParallelSpecialistResult,
  evaluation: ReturnType<typeof evaluateParallelExecution>
): string {
  const successfulAgents = result.results
    .filter((r: AgentBranchResult) => r.status === 'completed' && !r.error)
    .map((r: AgentBranchResult) => r.agentKey);

  const failedAgents = result.results
    .filter((r: AgentBranchResult) => r.status === 'failed' || r.error)
    .map((r: AgentBranchResult) => r.agentKey);

  let narrative = result.mergedNarrative;

  if (evaluation.shouldDegrade) {
    narrative += `\n\n[Orchestrator] Completed with partial results: ${evaluation.successCount}/${result.results.length} agents succeeded.`;
    narrative += `\nSuccessful: ${successfulAgents.join(', ')}`;
    narrative += `\nFailed: ${failedAgents.join(', ')} (continuing with available data)`;
  }

  return narrative;
}
