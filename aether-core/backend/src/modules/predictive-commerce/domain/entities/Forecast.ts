export class Forecast {
  constructor(
    public id: string,
    public productId: string,
    public period: string,           // e.g. "next_30_days"
    public predictedDemand: number,
    public confidence: number,       // 0.0 - 1.0
    public factors: string[],        // e.g. ["seasonality", "trend", "competitor_price"]
    public createdAt: Date = new Date()
  ) {}
}