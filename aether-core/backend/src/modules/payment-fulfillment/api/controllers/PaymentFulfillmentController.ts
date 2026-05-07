import { Request, Response } from 'express';
import { ProcessPaymentUseCase } from '../../application/use-cases/ProcessPaymentUseCase';
import { PaymentService } from '../../application/services/PaymentService';
import { FulfillmentService } from '../../application/services/FulfillmentService';

export class PaymentFulfillmentController {
  private processPaymentUseCase: ProcessPaymentUseCase;
  private fulfillmentService: FulfillmentService;

  constructor() {
    // In real app these would be injected
    const paymentService = new PaymentService({} as any);
    this.processPaymentUseCase = new ProcessPaymentUseCase(paymentService);
    this.fulfillmentService = new FulfillmentService();
  }

  async processPayment(req: Request, res: Response) {
    try {
      const { orderId, amount, paymentMethod } = req.body;
      const payment = await this.processPaymentUseCase.execute(orderId, amount, paymentMethod);
      res.json({ success: true, payment });
    } catch (error) {
      res.status(500).json({ error: 'Payment processing failed' });
    }
  }

  async createFulfillment(req: Request, res: Response) {
    try {
      const { orderId } = req.body;
      const fulfillment = await this.fulfillmentService.createFulfillment(orderId);
      res.json({ success: true, fulfillment });
    } catch (error) {
      res.status(500).json({ error: 'Fulfillment creation failed' });
    }
  }

  async shipOrder(req: Request, res: Response) {
    try {
      const { fulfillmentId, carrier, trackingNumber } = req.body;
      const shipment = await this.fulfillmentService.ship(fulfillmentId, carrier, trackingNumber);
      res.json({ success: true, shipment });
    } catch (error) {
      res.status(500).json({ error: 'Shipping failed' });
    }
  }
}