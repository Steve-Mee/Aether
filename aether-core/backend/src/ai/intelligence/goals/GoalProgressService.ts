import type { ProactiveSuggestionService } from '../proactive/ProactiveSuggestionService';
import { GOAL_DRIFT_THRESHOLD_PCT } from './goalConfig';
import { GoalMetricResolver } from './GoalMetricResolver';
import { GoalRepository } from './GoalRepository';
import type { GoalOutcomeAttributionService } from './GoalOutcomeAttributionService';
import type { GoalProgressSource, MerchantGoalRecord } from './types';
import { computeExpectedProgressPct, computeProgressPct } from './goalValidation';
import { eventBus } from '../../../shared/events/eventBus';
import { notifyOverviewGoalSnapshot, notifyOverviewGoalMilestone, notifyOverviewGoalCompleted } from '../../../../modules/admin-command-bar/application/services/OverviewFeedNotify';
import { crossedGoalMilestone } from '../../../../modules/admin-command-bar/application/services/notifications/notificationTypes';

export interface GoalProgressResult {
  goal: MerchantGoalRecord;
  progressPct: number;
  drift?: import('./types').GoalDriftContext;
}

export class GoalProgressService {
  constructor(
    private repository: GoalRepository,
    private metricResolver: GoalMetricResolver,
    private proactiveService?: ProactiveSuggestionService,
    private outcomeAttribution?: GoalOutcomeAttributionService
  ) {}

  setProactiveService(service: ProactiveSuggestionService): void {
    this.proactiveService = service;
  }

  async refreshGoal(
    tenantId: string,
    goalId: string,
    source: GoalProgressSource = 'manual'
  ): Promise<GoalProgressResult | null> {
    const goal = await this.repository.findById(tenantId, goalId);
    if (!goal || goal.status !== 'active') return null;
    return this.evaluateGoal(tenantId, goal, source);
  }

  async refreshAllActive(tenantId: string, source: GoalProgressSource = 'periodic'): Promise<GoalProgressResult[]> {
    const goals = await this.repository.listActiveForProgress(tenantId);
    const results: GoalProgressResult[] = [];
    for (const goal of goals) {
      const result = await this.evaluateGoal(tenantId, goal, source);
      if (result) results.push(result);
    }
    return results;
  }

  private async evaluateGoal(
    tenantId: string,
    goal: MerchantGoalRecord,
    source: GoalProgressSource
  ): Promise<GoalProgressResult> {
    const resolved = await this.metricResolver.resolve(tenantId, goal);
    const progressPct = computeProgressPct(
      resolved.value,
      goal.baselineValue,
      goal.targetValue,
      goal.direction
    );

    const wasCompleted = goal.status === 'completed';
    const previousPct = goal.progressPct ?? 0;
    let status = goal.status;
    if (progressPct >= 100) {
      status = 'completed';
    } else if (goal.deadline < new Date() && progressPct < 100) {
      status = 'abandoned';
    }

    await this.repository.addSnapshot(tenantId, goal.id, resolved.value, progressPct, source);
    await this.repository.updateProgress(
      tenantId,
      goal.id,
      resolved.value,
      progressPct,
      status !== goal.status ? status : undefined
    );

    const updatedGoal: MerchantGoalRecord = {
      ...goal,
      currentValue: resolved.value,
      progressPct,
      status,
      completedAt: status === 'completed' ? new Date() : goal.completedAt,
    };

    if (status === 'completed' && !wasCompleted && this.outcomeAttribution) {
      const outcome = await this.outcomeAttribution.recordGoalCompletion(tenantId, updatedGoal);
      if (outcome) {
        updatedGoal.outcomeRecordId = outcome.outcomeRecordId;
        updatedGoal.verifiedUplift = outcome.uplift;
      }
      notifyOverviewGoalCompleted(tenantId, {
        id: updatedGoal.id,
        title: updatedGoal.title,
        completedAt: updatedGoal.completedAt ?? new Date(),
      });
    }

    const milestone = crossedGoalMilestone(previousPct, progressPct);
    if (milestone != null && !(status === 'completed' && !wasCompleted && milestone === 100)) {
      notifyOverviewGoalMilestone(tenantId, {
        id: updatedGoal.id,
        title: updatedGoal.title,
        progressPct,
        milestoneThreshold: milestone,
        updatedAt: new Date(),
      });
    }

    const expectedPct = computeExpectedProgressPct(goal.deadline, goal.createdAt);
    const daysRemaining = Math.max(
      0,
      Math.ceil((goal.deadline.getTime() - Date.now()) / 86_400_000)
    );
    const driftGap = expectedPct - progressPct;
    let drift: import('./types').GoalDriftContext | undefined;

    if (status === 'active' && expectedPct > 10 && driftGap >= GOAL_DRIFT_THRESHOLD_PCT) {
      drift = { goal: updatedGoal, progressPct, expectedPct, daysRemaining };
      await this.emitDriftFinding(tenantId, drift, resolved.metadata);
    }

    notifyOverviewGoalSnapshot(tenantId, {
      id: updatedGoal.id,
      title: updatedGoal.title,
      targetValue: updatedGoal.targetValue,
      currentValue: updatedGoal.currentValue,
      deadline: updatedGoal.deadline,
      updatedAt: new Date(),
    });

    return { goal: updatedGoal, progressPct, drift };
  }

  private async emitDriftFinding(
    tenantId: string,
    drift: import('./types').GoalDriftContext,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    const { goal, progressPct, expectedPct, daysRemaining } = drift;
    await eventBus.publish({
      tenantId,
      type: 'goals.progress_drift',
      payload: {
        goalId: goal.id,
        goalTitle: goal.title,
        progressPct,
        expectedPct,
        daysRemaining,
        metricType: goal.metricType,
        pursuitMode: goal.pursuitMode,
        targetValue: goal.targetValue,
        baselineValue: goal.baselineValue,
        currentValue: goal.currentValue,
        deadline: goal.deadline.toISOString(),
        metadata,
      },
    });
  }
}
