import * as Sentry from '@sentry/node';

export interface MultiAgentErrorContext {
  agentKey: string;
  intent: string;
  executionMode: 'parallel' | 'sequential' | 'single';
  tenantId: string;
  parentRunId?: string;
  attempt?: number;
  totalAttempts?: number;
}

export function captureMultiAgentError(
  error: Error,
  context: MultiAgentErrorContext,
  level: 'error' | 'warning' = 'error'
): void {
  if (process.env.NODE_ENV === 'test') return;

  Sentry.withScope((scope) => {
    scope.setContext('multi-agent', {
      agentKey: context.agentKey,
      intent: context.intent,
      executionMode: context.executionMode,
      attempt: context.attempt,
      totalAttempts: context.totalAttempts,
    });
    scope.setTag('agent_key', context.agentKey);
    scope.setTag('execution_mode', context.executionMode);
    scope.setUser({ id: context.tenantId });
    scope.setLevel(level);

    if (context.parentRunId) {
      scope.setContext('orchestration', {
        parentRunId: context.parentRunId,
      });
    }

    Sentry.captureException(error);
  });
}

export function captureOrchestratorDegradation(
  context: {
    successCount: number;
    failureCount: number;
    totalAgents: number;
    failedAgents: string[];
    tenantId: string;
    parentRunId?: string;
  }
): void {
  if (process.env.NODE_ENV === 'test') return;

  Sentry.withScope((scope) => {
    scope.setContext('orchestrator-degradation', {
      successCount: context.successCount,
      failureCount: context.failureCount,
      totalAgents: context.totalAgents,
      failedAgents: context.failedAgents,
    });
    scope.setTag('degradation', 'partial_success');
    scope.setUser({ id: context.tenantId });
    scope.setLevel('warning');

    if (context.parentRunId) {
      scope.setContext('orchestration', {
        parentRunId: context.parentRunId,
      });
    }

    Sentry.captureMessage(
      `Orchestrator degraded: ${context.successCount}/${context.totalAgents} agents succeeded`,
      'warning'
    );
  });
}
