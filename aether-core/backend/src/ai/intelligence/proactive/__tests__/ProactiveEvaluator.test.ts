import { ProactiveEvaluator } from '../ProactiveEvaluator';
import { ProactiveTriggerRegistry } from '../ProactiveTriggerRegistry';
import { marginDeclineTrigger } from '../triggers/marginDeclineTrigger';
import { orderAnomalyTrigger } from '../triggers/orderAnomalyTrigger';

describe('ProactiveEvaluator', () => {
  const adminData = {
    countLowMarginProducts: jest.fn(),
    getOrderTrends: jest.fn(),
  };

  const registry = new ProactiveTriggerRegistry([marginDeclineTrigger, orderAnomalyTrigger]);
  const evaluator = new ProactiveEvaluator(registry);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns margin decline finding when threshold met', async () => {
    adminData.countLowMarginProducts.mockResolvedValue(5);
    adminData.getOrderTrends.mockResolvedValue({
      recentCount: 30,
      priorCount: 28,
      trendPct: 5,
      statusBreakdown: {},
    });
    const findings = await evaluator.evaluatePeriodic('tenant-1', adminData as never);
    expect(findings.some((f) => f.triggerId === 'pricing.margin_decline')).toBe(true);
  });

  it('returns order anomaly when trend exceeds threshold', async () => {
    adminData.countLowMarginProducts.mockResolvedValue(0);
    adminData.getOrderTrends.mockResolvedValue({
      recentCount: 50,
      priorCount: 30,
      trendPct: 40,
      statusBreakdown: {},
    });
    const findings = await evaluator.evaluatePeriodic('tenant-1', adminData as never);
    expect(findings.some((f) => f.triggerId === 'general.order_anomaly')).toBe(true);
  });

  it('returns empty when no conditions met', async () => {
    adminData.countLowMarginProducts.mockResolvedValue(0);
    adminData.getOrderTrends.mockResolvedValue({
      recentCount: 30,
      priorCount: 28,
      trendPct: 5,
      statusBreakdown: {},
    });
    const findings = await evaluator.evaluatePeriodic('tenant-1', adminData as never);
    expect(findings).toHaveLength(0);
  });
});
