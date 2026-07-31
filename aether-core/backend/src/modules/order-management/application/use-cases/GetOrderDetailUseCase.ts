import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class GetOrderDetailUseCase {
  constructor(private repo: OrderRepository) {}

  async execute(tenantId: string, orderId: string) {
    const tid = requireTenantId(tenantId, 'GetOrderDetailUseCase.execute');
    return this.repo.findDetailById(orderId, tid);
  }
}
