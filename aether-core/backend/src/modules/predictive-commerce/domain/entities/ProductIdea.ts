export class ProductIdea {
  constructor(
    public id: string,
    public name: string,
    public description: string,
    public category: string,
    public suggestedPrice: number,
    public targetMargin: number,
    public confidence: number,
    public source: string,           // e.g. "trend_analysis", "supplier_data", "customer_behavior"
    public createdAt: Date = new Date()
  ) {}
}