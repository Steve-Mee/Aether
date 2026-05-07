export class ProductVariant {
  constructor(
    public readonly id: string,
    public readonly productId: string,
    public sku: string,
    public price: number,
    public currency: string,
    public stock: number
  ) {}
}