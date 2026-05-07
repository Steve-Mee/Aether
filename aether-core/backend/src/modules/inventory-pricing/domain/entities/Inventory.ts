export class Inventory {
  constructor(
    public id: string,
    public productId: string,
    public warehouseId: string,
    public quantity: number,
    public reserved: number = 0,
    public lastUpdated: Date = new Date()
  ) {}

  get available(): number {
    return this.quantity - this.reserved;
  }

  isLowStock(threshold: number = 10): boolean {
    return this.available < threshold;
  }
}
