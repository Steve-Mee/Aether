import { GoalMetricResolver } from '../GoalMetricResolver';
import type { AdminDataPort } from '../../../../modules/admin-command-bar/application/ports/AdminDataPort';
import type { MerchantGoalRecord } from '../types';

describe('GoalMetricResolver', () => {
  const adminData = {
    getMarginMetrics: jest.fn().mockResolvedValue({
      lowMarginCount: 3,
      totalProducts: 10,
      marginPct: 70,
    }),
    getOrderTrends: jest.fn().mockResolvedValue({
      recentCount: 42,
      priorCount: 35,
      trendPct: 20,
      statusBreakdown: {},
    }),
    getInventoryCostSummary: jest.fn().mockResolvedValue({
      lowStockCount: 5,
      totalSkus: 20,
      totalQuantity: 500,
    }),
    getCategoryRevenue: jest.fn().mockResolvedValue({
      categoryId: 'shoes',
      revenue: 1200,
      orderCount: 8,
      trendPct: 15,
    }),
  } as unknown as AdminDataPort;

  const resolver = new GoalMetricResolver(adminData);

  const goalBase = (metricType: MerchantGoalRecord['metricType']): MerchantGoalRecord =>
    ({
      metricType,
      metricScope: { categoryId: 'shoes' },
      baselineValue: 0,
      targetValue: 1,
      currentValue: null,
    }) as MerchantGoalRecord;

  it('resolves margin metrics', async () => {
    const result = await resolver.resolve('t1', goalBase('margin'));
    expect(result.value).toBe(70);
  });

  it('resolves revenue from order trends', async () => {
    const result = await resolver.resolve('t1', goalBase('revenue'));
    expect(result.value).toBe(42);
  });

  it('resolves inventory low stock count', async () => {
    const result = await resolver.resolve('t1', goalBase('inventory'));
    expect(result.value).toBe(5);
  });

  it('resolves category revenue trend', async () => {
    const result = await resolver.resolve('t1', goalBase('category_revenue'));
    expect(result.value).toBe(15);
  });

  it('flags category goal at risk when no data', async () => {
    (adminData.getCategoryRevenue as jest.Mock).mockResolvedValueOnce({
      categoryId: 'unknown',
      revenue: 0,
      orderCount: 0,
      trendPct: 0,
    });
    const result = await resolver.resolve('t1', {
      ...goalBase('category_revenue'),
      metricScope: { categoryId: 'unknown' },
    });
    expect(result.atRisk).toBe(true);
  });
});
