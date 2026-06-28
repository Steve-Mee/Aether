import { buildGoalDriftFinding, goalDriftTrigger } from '../triggers/goalDriftTrigger';

describe('goalDriftTrigger', () => {
  it('builds drift finding with goalId', () => {
    const finding = buildGoalDriftFinding({
      goal: {
        id: 'g1',
        tenantId: 't1',
        title: 'Marge 25%',
        description: null,
        metricType: 'margin',
        metricScope: {},
        targetValue: 25,
        baselineValue: 18,
        currentValue: 19,
        unit: 'percent',
        direction: 'increase',
        deadline: new Date('2026-12-31'),
        status: 'active',
        pursuitMode: 'balanced',
        parentGoalId: null,
        progressPct: 14,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date(),
        completedAt: null,
      },
      progressPct: 14,
      expectedPct: 40,
      daysRemaining: 20,
    });

    expect(finding.triggerId).toBe('goals.progress_drift');
    expect(finding.goalId).toBe('g1');
    expect(finding.title).toContain('Marge 25%');
  });

  it('evaluates event payload into findings', async () => {
    const findings = await goalDriftTrigger.evaluate({
      tenantId: 't1',
      adminData: {} as never,
      eventPayload: {
        goalId: 'g1',
        goalTitle: 'Test',
        progressPct: 10,
        expectedPct: 50,
        daysRemaining: 5,
        metricType: 'margin',
        pursuitMode: 'balanced',
      },
    });
    expect(findings).toHaveLength(1);
    expect(findings[0].goalId).toBe('g1');
  });
});
