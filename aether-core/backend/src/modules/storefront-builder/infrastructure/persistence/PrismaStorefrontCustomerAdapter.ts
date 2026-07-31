import { PrismaClient } from '@prisma/client';
import type {
  StorefrontCustomerPort,
  StorefrontCustomerRecord,
} from '../../application/ports/StorefrontCustomerPort';

export class PrismaStorefrontCustomerAdapter implements StorefrontCustomerPort {
  constructor(private readonly prisma: PrismaClient) {}

  async upsertByEmail(
    tenantId: string,
    input: { email: string; firstName?: string | null; lastName?: string | null }
  ): Promise<StorefrontCustomerRecord> {
    const customer = await this.prisma.customer.upsert({
      where: { tenantId_email: { tenantId, email: input.email } },
      create: {
        tenantId,
        email: input.email,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
      },
      update: {
        firstName: input.firstName ?? undefined,
        lastName: input.lastName ?? undefined,
      },
    });
    return { id: customer.id, email: customer.email };
  }
}
