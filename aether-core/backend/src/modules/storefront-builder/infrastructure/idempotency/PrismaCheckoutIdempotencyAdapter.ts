import { PrismaClient } from '@prisma/client';
import { requireTenantId } from '../../../../shared/tenant/tenantContext';
import {
  CheckoutIdempotencyPort,
  CheckoutIdempotencyRecord,
} from '../../application/ports/CheckoutIdempotencyPort';

export class PrismaCheckoutIdempotencyAdapter implements CheckoutIdempotencyPort {
  constructor(private readonly prisma: PrismaClient) {}

  async find(tenantId: string, key: string): Promise<CheckoutIdempotencyRecord | null> {
    const tid = requireTenantId(tenantId, 'PrismaCheckoutIdempotencyAdapter.find');
    const row = await this.prisma.storefrontCheckoutIdempotency.findUnique({
      where: { tenantId_key: { tenantId: tid, key } },
    });
    if (!row) return null;
    return {
      tenantId: row.tenantId,
      key: row.key,
      orderId: row.orderId,
      clientSecret: row.clientSecret,
      redirectUrl: row.redirectUrl,
    };
  }

  async save(record: CheckoutIdempotencyRecord): Promise<void> {
    const tid = requireTenantId(record.tenantId, 'PrismaCheckoutIdempotencyAdapter.save');
    await this.prisma.storefrontCheckoutIdempotency.upsert({
      where: { tenantId_key: { tenantId: tid, key: record.key } },
      create: {
        tenantId: tid,
        key: record.key,
        orderId: record.orderId,
        clientSecret: record.clientSecret,
        redirectUrl: record.redirectUrl,
      },
      update: {
        orderId: record.orderId,
        clientSecret: record.clientSecret,
        redirectUrl: record.redirectUrl,
      },
    });
  }
}
