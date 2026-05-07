export class MarketplaceListing {
  constructor(
    public id: string,
    public type: 'data-insight' | 'pricing-strategy' | 'customer-segment' | 'trend-report',
    public price: number,
    public sellerMerchantId: string,
    public createdAt: Date
  ) {}
}