import { prisma } from '../../../../shared/prisma/client';
import type { TenantDirectoryPort } from '../../application/ports/TenantDirectoryPort';

export class PrismaTenantDirectoryRepository implements TenantDirectoryPort {
  async listTenantIds(): Promise<string[]> {
    const rows = await prisma.tenantSettings.findMany({ select: { tenantId: true } });
    return rows.map((row) => row.tenantId);
  }
}
