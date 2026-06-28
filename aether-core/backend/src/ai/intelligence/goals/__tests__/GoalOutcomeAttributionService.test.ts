jest.mock('../../../attribution/OutcomeEngine', () => ({
  recordOutcome: jest.fn(),
}));

jest.mock('../../../../shared/events/eventBus', () => ({
  eventBus: { publish: jest.fn() },
}));

import { recordOutcome } from '../../../attribution/OutcomeEngine';
import { eventBus } from '../../../../shared/events/eventBus';
import { GoalOutcomeAttributionService } from '../GoalOutcomeAttributionService';

const mockRecordOutcome = recordOutcome as jest.Mock;
const mockPublish = eventBus.publish as jest.Mock;

describe('GoalOutcomeAttributionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOAL_OUTCOME_ATTRIBUTION_ENABLED = 'true';
    mockRecordOutcome.mockResolvedValue({ id: 'out-1', uplift: 5.2 });
  });

  it('records outcome and publishes goal.completed on completion', async () => {
    const service = new GoalOutcomeAttributionService();
    const goal = {
      id: 'goal-1',
      tenantId: 't1',
      title: 'Marge omhoog',
      description: null,
      metricType: 'margin' as const,
      metricScope: {},
      targetValue: 30,
      baselineValue: 20,
      currentValue: 31,
      unit: 'percent' as const,
      direction: 'increase' as const,
      deadline: new Date('2026-12-31'),
      status: 'completed' as const,
      pursuitMode: 'balanced' as const,
      parentGoalId: null,
      progressPct: 100,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
      completedAt: new Date('2026-06-01'),
    };

    const result = await service.recordGoalCompletion('t1', goal);
    expect(result?.outcomeRecordId).toBe('out-1');
    expect(mockRecordOutcome).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 't1',
        metric: 'margin_pct',
        goalId: 'goal-1',
        sourceType: 'goal_completion',
      })
    );
    expect(mockPublish).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'goal.completed', tenantId: 't1' })
    );
  });
});
