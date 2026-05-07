export class PriceAdjustment {
  constructor(
    public id: string,
    public productId: string,
    public oldPrice: number,
    public newPrice: number,
    public reason: string,
    public appliedAt: Date = new Date(),
    public appliedBy: 'SYSTEM' | 'AGENT' | 'MERCHANT' = 'SYSTEM'
  ) {}
}
