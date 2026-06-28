import type { ReflectionExperimentService } from './experiments/ReflectionExperimentService';

export class ReflectionMetricsRecorder {
  constructor(private experiments: ReflectionExperimentService) {}

  async recordGoalReached(
    tenantId: string,
    goalReached: boolean,
    runId?: string,
    variantArm?: string
  ): Promise<void> {
    await this.experiments.recordOutcome({
      tenantId,
      metric: 'reflection_goal_reached_rate',
      value: goalReached ? 1 : 0,
      runId,
      variantArm,
    });
  }

  async recordDelegationSuccess(
    tenantId: string,
    success: boolean,
    runId?: string,
    variantArm?: string
  ): Promise<void> {
    await this.experiments.recordOutcome({
      tenantId,
      metric: 'delegation_success_rate',
      value: success ? 1 : 0,
      runId,
      variantArm,
    });
  }

  async recordHandoffLatency(
    tenantId: string,
    latencyMs: number,
    runId?: string,
    variantArm?: string
  ): Promise<void> {
    await this.experiments.recordOutcome({
      tenantId,
      metric: 'handoff_latency_ms',
      value: latencyMs,
      runId,
      variantArm,
    });
  }

  async recordHintAdoption(
    tenantId: string,
    adopted: boolean,
    runId?: string,
    variantArm?: string
  ): Promise<void> {
    await this.experiments.recordOutcome({
      tenantId,
      metric: 'reflection_hint_adoption_rate',
      value: adopted ? 1 : 0,
      runId,
      variantArm,
    });
  }

  async recordPreferConfirmAccuracy(
    tenantId: string,
    accurate: boolean,
    runId?: string,
    variantArm?: string
  ): Promise<void> {
    await this.experiments.recordOutcome({
      tenantId,
      metric: 'reflection_prefer_confirm_accuracy',
      value: accurate ? 1 : 0,
      runId,
      variantArm,
    });
  }
}
