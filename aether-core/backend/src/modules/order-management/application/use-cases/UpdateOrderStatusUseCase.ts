import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { Order } from '../../domain/entities/Order';

export class UpdateOrderStatusUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(orderId: string, newStatus: Order['status']): Promise<Order | null> {
    // Basic validation - in real version we would add more rules here
    if (newStatus === 'cancelled') {
      // Could check if order is already shipped, etc.
    }

    return this.orderRepository.updateStatus(orderId, newStatus);
  }
}