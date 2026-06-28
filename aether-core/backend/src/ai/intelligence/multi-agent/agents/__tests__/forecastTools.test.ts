import { getForecastSummaryTool, forecastProductDemandTool } from '../forecastTools';

describe('forecastTools', () => {
  const adminData = {
    countForecasts: jest.fn().mockResolvedValue(3),
    listForecasts: jest.fn().mockResolvedValue([
      { id: 'f1', productId: 'p1', prediction: 'high', confidence: 0.9 },
    ]),
  };
  const demandForecaster = {
    forecastDemand: jest.fn().mockResolvedValue({
      productId: 'p1',
      predictedDemand: 42,
      confidence: 0.85,
    }),
  };

  it('getForecastSummary returns count and recent', async () => {
    const tool = getForecastSummaryTool({ adminData: adminData as never, demandForecaster: demandForecaster as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, {});
    expect(result).toMatchObject({ success: true, forecastCount: 3 });
  });

  it('forecastProductDemand calls forecaster', async () => {
    const tool = forecastProductDemandTool({ adminData: adminData as never, demandForecaster: demandForecaster as never });
    const result = await tool.executeRead!({ tenantId: 't1' }, { productId: 'p1' });
    expect(result).toMatchObject({ success: true });
    expect(demandForecaster.forecastDemand).toHaveBeenCalledWith('p1', 't1', 30);
  });
});
