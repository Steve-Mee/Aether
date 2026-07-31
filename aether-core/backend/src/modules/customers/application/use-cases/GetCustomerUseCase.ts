import type { AdminDataPort } from '../../../admin-command-bar/application/ports/AdminDataPort';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class GetCustomerUseCase {
  constructor(private adminData: AdminDataPort) {}

  async execute(tenantId: string, customerId: string) {
    const tid = requireTenantId(tenantId, 'GetCustomerUseCase.execute');
    return this.adminData.getCustomerById(tid, customerId);
  }
}
