import { prisma } from '../../../../shared/prisma/client';
import type {
  BilateralContractRecord,
  BilateralExchangeRepository,
  BilateralPackageRecord,
  BilateralPackageWithContract,
  BilateralSchemaRecord,
  CreateContractInput,
  CreatePackageInput,
} from '../../application/ports/BilateralExchangeRepository';

const schemaInclude = { schema: true } as const;

function mapSchema(schema: {
  id: string;
  schemaKey: string;
  fields: unknown;
  description: string;
}): BilateralSchemaRecord {
  return {
    id: schema.id,
    schemaKey: schema.schemaKey,
    fields: schema.fields,
    description: schema.description,
  };
}

function mapContract(row: {
  id: string;
  status: string;
  providerTenantId: string;
  consumerTenantId: string;
  schemaId: string;
  allowedFields: unknown;
  ttlExpiresAt: Date | null;
  consentProviderAt: Date | null;
  consentConsumerAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  schema: { id: string; schemaKey: string; fields: unknown; description: string };
}): BilateralContractRecord {
  return {
    id: row.id,
    status: row.status,
    providerTenantId: row.providerTenantId,
    consumerTenantId: row.consumerTenantId,
    schemaId: row.schemaId,
    allowedFields: row.allowedFields,
    ttlExpiresAt: row.ttlExpiresAt,
    consentProviderAt: row.consentProviderAt,
    consentConsumerAt: row.consentConsumerAt,
    revokedAt: row.revokedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    schema: mapSchema(row.schema),
  };
}

function mapPackage(row: {
  id: string;
  contractId: string;
  payloadJson: unknown;
  packageHash: string;
  expiresAt: Date;
  createdAt: Date;
  deletedAt: Date | null;
}): BilateralPackageRecord {
  return {
    id: row.id,
    contractId: row.contractId,
    payloadJson: row.payloadJson,
    packageHash: row.packageHash,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    deletedAt: row.deletedAt,
  };
}

export class PrismaBilateralExchangeRepository implements BilateralExchangeRepository {
  async listSchemas() {
    const rows = await prisma.bilateralExchangeSchema.findMany({ orderBy: { schemaKey: 'asc' } });
    return rows.map(mapSchema);
  }

  async findSchemaByKey(schemaKey: string) {
    const row = await prisma.bilateralExchangeSchema.findUnique({ where: { schemaKey } });
    return row ? mapSchema(row) : null;
  }

  async findSchemaById(schemaId: string) {
    const row = await prisma.bilateralExchangeSchema.findUnique({ where: { id: schemaId } });
    return row ? mapSchema(row) : null;
  }

  async findTenantBySlug(slug: string) {
    return prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  }

  async findTenantById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true },
    });
  }

  async findTenantsByIds(ids: string[]) {
    return prisma.tenant.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true, slug: true },
    });
  }

  async listContractsForTenant(tenantId: string) {
    const rows = await prisma.bilateralExchangeContract.findMany({
      where: {
        OR: [{ providerTenantId: tenantId }, { consumerTenantId: tenantId }],
      },
      orderBy: { createdAt: 'desc' },
      include: schemaInclude,
    });
    return rows.map(mapContract);
  }

  async findContractById(contractId: string) {
    const row = await prisma.bilateralExchangeContract.findUnique({
      where: { id: contractId },
      include: schemaInclude,
    });
    return row ? mapContract(row) : null;
  }

  async createContract(input: CreateContractInput) {
    const row = await prisma.bilateralExchangeContract.create({
      data: {
        providerTenantId: input.providerTenantId,
        consumerTenantId: input.consumerTenantId,
        schemaId: input.schemaId,
        allowedFields: input.allowedFields,
        ttlExpiresAt: input.ttlExpiresAt,
        status: 'pending',
        consentProviderAt: new Date(),
      },
      include: schemaInclude,
    });
    return mapContract(row);
  }

  async updateContractAccepted(contractId: string) {
    const row = await prisma.bilateralExchangeContract.update({
      where: { id: contractId },
      data: {
        status: 'active',
        consentConsumerAt: new Date(),
      },
      include: schemaInclude,
    });
    return mapContract(row);
  }

  async revokeContract(contractId: string) {
    await prisma.bilateralExchangeContract.update({
      where: { id: contractId },
      data: { status: 'revoked', revokedAt: new Date() },
    });
  }

  async softDeletePackagesForContract(contractId: string) {
    await prisma.bilateralExchangePackage.updateMany({
      where: { contractId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
  }

  async listPackagesForContract(contractId: string) {
    const rows = await prisma.bilateralExchangePackage.findMany({
      where: { contractId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(mapPackage);
  }

  async findPackageById(packageId: string): Promise<BilateralPackageWithContract | null> {
    const row = await prisma.bilateralExchangePackage.findUnique({
      where: { id: packageId },
      include: { contract: { include: schemaInclude } },
    });
    if (!row) return null;
    return {
      ...mapPackage(row),
      contract: mapContract(row.contract),
    };
  }

  async createPackage(input: CreatePackageInput) {
    const row = await prisma.bilateralExchangePackage.create({
      data: {
        contractId: input.contractId,
        payloadJson: input.payloadJson as Parameters<
          typeof prisma.bilateralExchangePackage.create
        >[0]['data']['payloadJson'],
        packageHash: input.packageHash,
        expiresAt: input.expiresAt,
      },
    });
    return mapPackage(row);
  }

  async listAuditForContract(contractId: string, take = 50) {
    const rows = await prisma.bilateralExchangeAudit.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows;
  }

  async listAudit(contractId?: string, take = 200) {
    return prisma.bilateralExchangeAudit.findMany({
      where: contractId ? { contractId } : undefined,
      orderBy: { createdAt: 'desc' },
      take,
    });
  }

  async createAudit(input: {
    contractId: string;
    action: string;
    actorTenantId: string;
    recordCount?: number | null;
    fieldHash?: string | null;
  }) {
    await prisma.bilateralExchangeAudit.create({
      data: {
        contractId: input.contractId,
        action: input.action,
        actorTenantId: input.actorTenantId,
        recordCount: input.recordCount ?? null,
        fieldHash: input.fieldHash ?? null,
      },
    });
  }
}
