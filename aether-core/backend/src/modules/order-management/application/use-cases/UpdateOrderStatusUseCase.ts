import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { Order } from '../../domain/entities/Order';

export class UpdateOrderStatusUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(
    orderId: string,
    newStatus: Order['status'],
    tenantId: string
  ): Promise<Order | null> {
    return this.orderRepository.updateStatus(orderId, newStatus, tenantId);
  }
}
