import type { AdminDataPort } from '../../../admin-command-bar/application/ports/AdminDataPort';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class ListCustomersUseCase {
  constructor(private adminData: AdminDataPort) {}

  async execute(tenantId: string, days = 90) {
    const tid = requireTenantId(tenantId, 'ListCustomersUseCase.execute');
    const customers = await this.adminData.listCustomers(tid, days);
    return { customers };
  }
}
