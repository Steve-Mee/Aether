export class SupplierProduct {
  constructor(
    public readonly id: string,
    public readonly supplierId: string,
    public name: string,
    public sku: string,
    public currentPrice: number,
    public currency: string,
    public stockLevel: number,
    public lastChecked: Date
  ) {}
}