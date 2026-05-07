export class Fulfillment {
  constructor(
    public id: string,
    public orderId: string,
    public status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' = 'pending',
    public trackingNumber?: string,
    public carrier?: string,
    public estimatedDelivery?: Date,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date()
  ) {}
}