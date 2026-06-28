import {
  getAutonomyMetricsTool,
  listDecisionsTool,
  routeAutonomousDecisionTool,
} from '../autonomyTools';

jest.mock('../../../../../shared/autonomy/AutonomyMetricsService', () => ({
  getAutonomyMetrics: jest.fn().mockResolvedValue({
    totalDecisions: 10,
    autonomousDecisions: 7,
    humanGatedDecisions: 3,
    autonomyRate: 0.7,
    targetMet: true,
    byModule: {},
  }),
}));

jest.mock('../../autonomyRouting', () => ({
  assessAutonomousRouteAllowed: jest.fn().mockResolvedValue({
    allowed: true,
    reason: 'ok',
    requiresApproval: false,
    route: { agentKey: 'pricing', intent: 'PRICING_OPTIMIZE' },
  }),
}));

import { assessAutonomousRouteAllowed } from '../../autonomyRouting';

describe('autonomyTools', () => {
  const ctx = { tenantId: 'tenant_1', actorId: 'user_1' };

  it('getAutonomyMetrics returns KPIs', async () => {
    const tool = getAutonomyMetricsTool();
    const result = await tool.executeRead!(ctx as never, { periodDays: 30 });
    expect(result).toMatchObject({ success: true, metrics: expect.objectContaining({ autonomyRate: 0.7 }) });
  });

  it('listDecisions reads from repository', async () => {
    const decisionRepository = {
      findAll: jest.fn().mockResolvedValue([
        { id: 'd1', tenantId: 'tenant_1', type: 'pricing.adjust', result: 'ok', createdAt: new Date() },
      ]),
    };
    const tool = listDecisionsTool({ decisionRepository: decisionRepository as never });
    const result = await tool.executeRead!(ctx as never, { limit: 5 });
    expect(result).toMatchObject({ success: true, count: 1 });
  });

  it('routeAutonomousDecision returns delegate hint when allowed', async () => {
    const tool = routeAutonomousDecisionTool();
    const result = await tool.executeRead!(ctx as never, {
      decisionType: 'pricing.adjust',
      result: 'review margins',
    });
    expect(result).toMatchObject({
      success: true,
      allowed: true,
      delegateHint: expect.objectContaining({ agentKey: 'pricing' }),
    });
    expect(assessAutonomousRouteAllowed).toHaveBeenCalled();
  });
});
