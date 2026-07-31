import { OrderRepository } from '../../domain/repositories/OrderRepository';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class ShipOrderUseCase {
  constructor(private repo: OrderRepository) {}

  async execute(
    tenantId: string,
    orderId: string,
    data: { carrier: string; trackingNumber: string }
  ) {
    const tid = requireTenantId(tenantId, 'ShipOrderUseCase.execute');
    const shipment = await this.repo.createShipment(orderId, tid, data);
    if (!shipment) return null;
    const order = await this.repo.findDetailById(orderId, tid);
    return { shipment, order };
  }
}
