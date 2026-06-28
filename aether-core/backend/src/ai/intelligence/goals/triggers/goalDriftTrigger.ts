import type { ProactiveFinding, ProactiveTriggerDefinition } from '../../proactive/ProactiveTriggerDefinition';
import { GOAL_METRIC_AGENT_MAP, type GoalDriftContext } from '../types';

export function buildGoalDriftFinding(
  drift: GoalDriftContext,
  metadata?: Record<string, unknown>
): ProactiveFinding {
  const { goal, progressPct, expectedPct, daysRemaining } = drift;
  const agentKey = GOAL_METRIC_AGENT_MAP[goal.metricType] ?? 'workflow_supervisor';
  const pursuitMode = goal.pursuitMode;
  const executionMode =
    pursuitMode === 'conservative' ? 'inform_only' : 'approval_required';

  return {
    triggerId: 'goals.progress_drift',
    dedupeKey: `goals.progress_drift:${goal.id}:${new Date().toISOString().slice(0, 10)}`,
    agentKey,
    title: `Doel "${goal.title}" loopt achter — ${Math.round(progressPct)}% vs ${Math.round(expectedPct)}% verwacht`,
    summary: `Nog ${daysRemaining} dagen tot deadline. Overweeg actie om dit doel te halen.`,
    command: `Help me het doel "${goal.title}" te halen`,
    intentId: 'PLAN_AND_DELEGATE',
    category: 'algemeen',
    riskLevel: 'low',
    executionMode,
    priority: pursuitMode === 'aggressive' ? 8 : pursuitMode === 'balanced' ? 6 : 4,
    evidence: {
      goalId: goal.id,
      progressPct,
      expectedPct,
      daysRemaining,
      metricType: goal.metricType,
      ...metadata,
    },
    goalId: goal.id,
  };
}

export const goalDriftTrigger: ProactiveTriggerDefinition = {
  id: 'goals.progress_drift',
  agentKey: 'workflow_supervisor',
  category: 'algemeen',
  mode: 'event',
  eventType: 'goals.progress_drift',
  defaultRiskLevel: 'low',
  cooldownMs: 12 * 60 * 60 * 1000,
  async evaluate(ctx) {
    const payload = ctx.eventPayload;
    if (!payload?.goalId || typeof payload.goalTitle !== 'string') return [];

    const progressPct = Number(payload.progressPct ?? 0);
    const expectedPct = Number(payload.expectedPct ?? 0);
    const daysRemaining = Number(payload.daysRemaining ?? 0);
    const metricType = String(payload.metricType ?? 'margin');
    const pursuitMode = String(payload.pursuitMode ?? 'balanced') as
      | 'conservative'
      | 'balanced'
      | 'aggressive';

    const drift: GoalDriftContext = {
      goal: {
        id: String(payload.goalId),
        tenantId: ctx.tenantId,
        title: payload.goalTitle,
        description: null,
        metricType: metricType as GoalDriftContext['goal']['metricType'],
        metricScope: {},
        targetValue: Number(payload.targetValue ?? 0),
        baselineValue: Number(payload.baselineValue ?? 0),
        currentValue: Number(payload.currentValue ?? 0),
        unit: 'percent',
        direction: 'increase',
        deadline: new Date(String(payload.deadline ?? Date.now())),
        status: 'active',
        pursuitMode,
        parentGoalId: null,
        progressPct,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      },
      progressPct,
      expectedPct,
      daysRemaining,
    };

    return [buildGoalDriftFinding(drift, payload.metadata as Record<string, unknown> | undefined)];
  },
};
