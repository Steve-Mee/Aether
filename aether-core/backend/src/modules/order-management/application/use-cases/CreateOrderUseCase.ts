import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { Order } from '../../domain/entities/Order';

export class CreateOrderUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(input: {
    customerId: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
    currency?: string;
  }): Promise<Order> {
    const total = input.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const order = await this.orderRepository.create({
      customerId: input.customerId,
      status: 'pending',
      total,
      currency: input.currency || 'EUR',
      items: input.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      }))
    });

    return order;
  }
}