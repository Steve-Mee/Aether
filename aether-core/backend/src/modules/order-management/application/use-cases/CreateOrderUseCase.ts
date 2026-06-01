import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class CreateOrderUseCase {
  constructor(private orderRepository: OrderRepository) {}

  async execute(data: {
    tenantId: string;
    customerId: string;
    items: Array<{ productId: string; quantity: number; price: number }>;
  }) {
    const tid = requireTenantId(data.tenantId, 'CreateOrderUseCase.execute');
    const total = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

    return this.orderRepository.create({
      tenantId: tid,
      customerId: data.customerId,
      status: 'pending',
      total,
      currency: 'EUR',
      items: data.items.map((item, index) => ({
        id: `item_${Date.now()}_${index}`,
        ...item,
      })),
    });
  }
}
