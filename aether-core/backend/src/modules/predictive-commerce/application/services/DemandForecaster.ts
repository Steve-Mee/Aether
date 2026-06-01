import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import type { DemandForecastPort } from '../ports/DemandForecastPort';

export class DemandForecaster {
  constructor(private history: DemandForecastPort) {}

  async forecastDemand(productId: string, tenantId: string, days: number = 30): Promise<any> {
    const tid = requireTenantId(tenantId, 'DemandForecaster.forecastDemand');
    const since = new Date(Date.now() - 90 * 86400000);
    const orderItems = await this.history.getOrderHistory(productId, tid, since);

    const totalQty = orderItems.reduce((sum, i) => sum + i.quantity, 0);
    const daysObserved = Math.max(1, Math.ceil((Date.now() - since.getTime()) / 86400000));
    const dailyAvg = totalQty / daysObserved;
    const seasonality = Math.sin(Date.now() / 10000000) * (dailyAvg * 0.1);
    const predictedDemand = Math.max(1, Math.floor(dailyAvg * days + seasonality));

    return {
      productId,
      period: `next_${days}_days`,
      predictedDemand,
      confidence: orderItems.length > 5 ? 0.85 : 0.6,
      factors: ['order_history', 'seasonality'],
      baselineDailyAvg: dailyAvg,
      generatedAt: new Date(),
    };
  }
}
