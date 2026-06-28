import { GoalSuggestionLinker } from '../GoalSuggestionLinker';
import type { ProactiveFinding } from '../../proactive/ProactiveTriggerDefinition';
import type { GoalRepository } from '../GoalRepository';

describe('GoalSuggestionLinker', () => {
  const mockRepo = {
    listActiveForProgress: jest.fn(),
  } as unknown as GoalRepository;

  const linker = new GoalSuggestionLinker(mockRepo);

  it('prefixes title and links goalId for margin trigger', async () => {
    (mockRepo.listActiveForProgress as jest.Mock).mockResolvedValue([
      {
        id: 'goal-1',
        tenantId: 't1',
        title: 'Marge +5%',
        description: null,
        metricType: 'margin',
        metricScope: {},
        targetValue: 30,
        baselineValue: 20,
        currentValue: 22,
        unit: 'percent',
        direction: 'increase',
        deadline: new Date(),
        status: 'active',
        pursuitMode: 'balanced',
        parentGoalId: null,
        progressPct: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
        completedAt: null,
      },
    ]);

    const finding: ProactiveFinding = {
      triggerId: 'pricing.margin_decline',
      dedupeKey: 'test',
      agentKey: 'pricing',
      title: 'Lage marge gedetecteerd',
      command: 'Optimaliseer prijzen',
      intentId: 'PRICING_OPTIMIZE',
      category: 'prijs',
      riskLevel: 'low',
      executionMode: 'autonomous',
      priority: 5,
      evidence: {},
    };

    const linked = await linker.linkFinding('t1', finding);
    expect(linked.goalId).toBe('goal-1');
    expect(linked.title).toContain('Marge +5%');
    expect(linked.priority).toBeGreaterThan(finding.priority);
  });

  it('returns finding unchanged when no matching goals', async () => {
    (mockRepo.listActiveForProgress as jest.Mock).mockResolvedValue([]);
    const finding: ProactiveFinding = {
      triggerId: 'pricing.margin_decline',
      dedupeKey: 'test',
      agentKey: 'pricing',
      title: 'Lage marge',
      command: 'cmd',
      intentId: 'PRICING_OPTIMIZE',
      category: 'prijs',
      riskLevel: 'low',
      executionMode: 'autonomous',
      priority: 5,
      evidence: {},
    };
    const linked = await linker.linkFinding('t1', finding);
    expect(linked.goalId).toBeUndefined();
    expect(linked.title).toBe(finding.title);
  });
});
