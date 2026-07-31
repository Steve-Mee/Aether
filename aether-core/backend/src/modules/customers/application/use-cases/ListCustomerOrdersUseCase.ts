import type { OrderRepository } from '../../../order-management/domain/repositories/OrderRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class ListCustomerOrdersUseCase {
  constructor(private orderRepo: OrderRepository) {}

  async execute(tenantId: string, customerId: string) {
    const tid = requireTenantId(tenantId, 'ListCustomerOrdersUseCase.execute');
    const orders = await this.orderRepo.findByCustomerId(customerId, tid);
    return { orders };
  }
}
