export class Shipment {
  constructor(
    public id: string,
    public fulfillmentId: string,
    public trackingNumber: string,
    public carrier: string,
    public status: 'in_transit' | 'delivered' | 'returned' = 'in_transit',
    public shippedAt?: Date,
    public deliveredAt?: Date
  ) {}
}