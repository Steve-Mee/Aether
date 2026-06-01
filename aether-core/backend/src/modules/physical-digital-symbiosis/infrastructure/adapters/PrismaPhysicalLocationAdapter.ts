import { prisma } from '../../../../shared/prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';

export class PrismaPhysicalLocationAdapter {
  async createLocation(
    tenantId: string,
    data: { name: string; address?: string; type: string }
  ) {
    const tid = requireTenantId(tenantId, 'PhysicalLocation.create');
    return prisma.physicalLocation.create({
      data: { tenantId: tid, ...data, status: 'active' },
    });
  }

  async listLocations(tenantId: string) {
    const tid = requireTenantId(tenantId, 'PhysicalLocation.list');
    return prisma.physicalLocation.findMany({ where: { tenantId: tid } });
  }
}
