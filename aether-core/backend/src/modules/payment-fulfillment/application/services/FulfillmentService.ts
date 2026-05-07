import { Fulfillment } from '../../domain/entities/Fulfillment';
import { Shipment } from '../../domain/entities/Shipment';

export class FulfillmentService {
  async createFulfillment(orderId: string): Promise<Fulfillment> {
    return new Fulfillment(
      `ful_${Date.now()}`,
      orderId,
      'pending'
    );
  }

  async ship(fulfillmentId: string, carrier: string, trackingNumber: string): Promise<Shipment> {
    const shipment = new Shipment(
      `ship_${Date.now()}`,
      fulfillmentId,
      trackingNumber,
      carrier,
      'in_transit',
      new Date()
    );

    // In real system: update fulfillment status + trigger webhook
    return shipment;
  }
}