import {
  getOrchestratorFallbackStrategy,
  evaluateParallelExecution,
  buildDegradedNarrative,
} from '../orchestratorFallback';
import type { ParallelSpecialistResult, AgentBranchResult } from '../../types';

describe('orchestratorFallback', () => {
  beforeEach(() => {
    delete process.env.MULTI_AGENT_CONTINUE_ON_ERROR;
    delete process.env.MULTI_AGENT_MIN_SUCCESSFUL;
    delete process.env.MULTI_AGENT_DEGRADE_GRACEFULLY;
  });

  it('getOrchestratorFallbackStrategy returns defaults', () => {
    const strategy = getOrchestratorFallbackStrategy();
    expect(strategy.continueOnError).toBe(true);
    expect(strategy.minSuccessfulAgents).toBe(0);
    expect(strategy.degradeGracefully).toBe(true);
  });

  it('evaluateParallelExecution recognizes full success', () => {
    const result: ParallelSpecialistResult = {
      results: [
        { agentKey: 'a1', status: 'completed', narrative: 'ok' },
        { agentKey: 'a2', status: 'completed', narrative: 'ok' },
      ] as AgentBranchResult[],
      mergedNarrative: '',
      mergedToolTrace: [],
      pendingActions: [],
      agentRunIds: [],
    };
    const strategy = getOrchestratorFallbackStrategy();
    const evaluation = evaluateParallelExecution(result, strategy);
    expect(evaluation.success).toBe(true);
    expect(evaluation.successCount).toBe(2);
    expect(evaluation.failureCount).toBe(0);
    expect(evaluation.shouldDegrade).toBe(false);
  });

  it('evaluateParallelExecution recognizes partial success', () => {
    const result: ParallelSpecialistResult = {
      results: [
        { agentKey: 'a1', status: 'completed', narrative: 'ok' },
        { agentKey: 'a2', status: 'failed', narrative: '', error: 'fail' },
      ] as AgentBranchResult[],
      mergedNarrative: '',
      mergedToolTrace: [],
      pendingActions: [],
      agentRunIds: [],
    };
    const strategy = getOrchestratorFallbackStrategy();
    const evaluation = evaluateParallelExecution(result, strategy);
    expect(evaluation.success).toBe(true);
    expect(evaluation.successCount).toBe(1);
    expect(evaluation.failureCount).toBe(1);
    expect(evaluation.shouldDegrade).toBe(true);
  });

  it('evaluateParallelExecution fails if minSuccessfulAgents not met', () => {
    const result: ParallelSpecialistResult = {
      results: [
        { agentKey: 'a1', status: 'completed', narrative: 'ok' },
        { agentKey: 'a2', status: 'failed', narrative: '', error: 'fail' },
      ] as AgentBranchResult[],
      mergedNarrative: '',
      mergedToolTrace: [],
      pendingActions: [],
      agentRunIds: [],
    };
    const strategy = { ...getOrchestratorFallbackStrategy(), minSuccessfulAgents: 2 };
    const evaluation = evaluateParallelExecution(result, strategy);
    expect(evaluation.success).toBe(false);
    expect(evaluation.successCount).toBe(1);
  });

  it('buildDegradedNarrative appends degradation notice', () => {
    const result: ParallelSpecialistResult = {
      results: [
        { agentKey: 'inventory', status: 'completed', narrative: 'Inventory ok' },
        { agentKey: 'forecast', status: 'failed', narrative: '', error: 'timeout' },
      ] as AgentBranchResult[],
      mergedNarrative: '[inventory] Inventory ok\n[forecast] Error: timeout',
      mergedToolTrace: [],
      pendingActions: [],
      agentRunIds: [],
    };
    const evaluation = {
      success: true,
      successCount: 1,
      failureCount: 1,
      shouldDegrade: true,
    };
    const narrative = buildDegradedNarrative(result, evaluation);
    expect(narrative).toContain('Completed with partial results: 1/2');
    expect(narrative).toContain('Successful: inventory');
    expect(narrative).toContain('Failed: forecast');
  });
});
