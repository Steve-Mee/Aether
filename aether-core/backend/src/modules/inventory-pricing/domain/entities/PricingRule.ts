export type PricingStrategy = 
  | 'MARGIN_BASED' 
  | 'COMPETITOR_BASED' 
  | 'DEMAND_BASED' 
  | 'FIXED';

export class PricingRule {
  constructor(
    public id: string,
    public productId: string,
    public strategy: PricingStrategy,
    public minMargin: number,
    public maxMargin: number,
    public competitorAdjustment: number = 0,
    public demandMultiplier: number = 1.0,
    public isActive: boolean = true,
    public updatedAt: Date = new Date()
  ) {}
}
