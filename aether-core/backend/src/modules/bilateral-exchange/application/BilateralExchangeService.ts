import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../shared/prisma/client';
import { getMerchantSettings } from '../../../shared/settings/TenantSettingsService';
import { BilateralExportBuilder } from './BilateralExportBuilder';
import { BilateralImportAdapter } from './BilateralImportAdapter';
import { BilateralSafetyFilter } from './BilateralSafetyFilter';
import {
  toContractDto,
  toPackageDto,
  type BilateralAuditDto,
  type BilateralContractDto,
  type BilateralPackageDto,
} from './bilateralContractDto';
import { BilateralHttpError } from './bilateralErrors';

export interface ProposeContractInput {
  providerTenantId: string;
  consumerTenantId?: string;
  consumerTenantSlug?: string;
  schemaKey: string;
  allowedFields: string[];
  ttlExpiresAt?: Date;
}

export class BilateralExchangeService {
  private exportBuilder = new BilateralExportBuilder();
  private safetyFilter = new BilateralSafetyFilter();

  constructor(private importAdapter: BilateralImportAdapter) {}

  async listSchemas() {
    return prisma.bilateralExchangeSchema.findMany({ orderBy: { schemaKey: 'asc' } });
  }

  async listContracts(tenantId: string): Promise<BilateralContractDto[]> {
    const rows = await prisma.bilateralExchangeContract.findMany({
      where: {
        OR: [{ providerTenantId: tenantId }, { consumerTenantId: tenantId }],
      },
      orderBy: { createdAt: 'desc' },
      include: { schema: true },
    });

    const partnerIds = new Set<string>();
    for (const row of rows) {
      partnerIds.add(row.providerTenantId === tenantId ? row.consumerTenantId : row.providerTenantId);
    }

    const partners = await prisma.tenant.findMany({
      where: { id: { in: [...partnerIds] } },
      select: { id: true, name: true, slug: true },
    });
    const partnerById = new Map(partners.map((p) => [p.id, p]));

    return rows.map((row) => {
      const partnerId =
        row.providerTenantId === tenantId ? row.consumerTenantId : row.providerTenantId;
      return toContractDto(row, tenantId, partnerById.get(partnerId));
    });
  }

  async getContract(contractId: string, tenantId: string): Promise<BilateralContractDto> {
    const row = await prisma.bilateralExchangeContract.findUnique({
      where: { id: contractId },
      include: { schema: true },
    });
    if (!row) throw new BilateralHttpError('Contract not found', 404);
    if (row.providerTenantId !== tenantId && row.consumerTenantId !== tenantId) {
      throw new BilateralHttpError('Not a party to this contract', 403);
    }
    const partnerId =
      row.providerTenantId === tenantId ? row.consumerTenantId : row.providerTenantId;
    const partner = await prisma.tenant.findUnique({
      where: { id: partnerId },
      select: { id: true, name: true, slug: true },
    });
    return toContractDto(row, tenantId, partner ?? undefined);
  }

  async resolveConsumerTenantId(input: {
    consumerTenantId?: string;
    consumerTenantSlug?: string;
  }): Promise<string> {
    if (input.consumerTenantId) return input.consumerTenantId;
    if (input.consumerTenantSlug) {
      const tenant = await prisma.tenant.findUnique({
        where: { slug: input.consumerTenantSlug },
        select: { id: true },
      });
      if (!tenant) throw new BilateralHttpError('Partner tenant not found', 404);
      return tenant.id;
    }
    throw new BilateralHttpError('consumerTenantId or consumerTenantSlug required', 400);
  }

  async proposeContract(input: ProposeContractInput) {
    const enabled = await this.isEnabled(input.providerTenantId);
    if (!enabled) throw new BilateralHttpError('Bilateral exchange disabled for provider', 403);

    const consumerTenantId = await this.resolveConsumerTenantId({
      consumerTenantId: input.consumerTenantId,
      consumerTenantSlug: input.consumerTenantSlug,
    });

    if (consumerTenantId === input.providerTenantId) {
      throw new BilateralHttpError('Cannot propose contract with self', 400);
    }

    const consumerEnabled = await this.isEnabled(consumerTenantId);
    if (!consumerEnabled) {
      throw new BilateralHttpError('Bilateral exchange disabled for partner', 403);
    }

    const schema = await prisma.bilateralExchangeSchema.findUnique({
      where: { schemaKey: input.schemaKey },
    });
    if (!schema) throw new BilateralHttpError('Unknown schema', 404);

    const schemaFields = Array.isArray(schema.fields) ? (schema.fields as string[]) : [];
    const invalid = input.allowedFields.filter((f) => !schemaFields.includes(f));
    if (invalid.length > 0) {
      throw new BilateralHttpError(`Fields not in schema: ${invalid.join(', ')}`, 400);
    }

    const contract = await prisma.bilateralExchangeContract.create({
      data: {
        providerTenantId: input.providerTenantId,
        consumerTenantId,
        schemaId: schema.id,
        allowedFields: input.allowedFields,
        ttlExpiresAt: input.ttlExpiresAt ?? null,
        status: 'pending',
        consentProviderAt: new Date(),
      },
      include: { schema: true },
    });

    await this.audit(contract.id, 'propose', input.providerTenantId, input.allowedFields.length);
    const partner = await prisma.tenant.findUnique({
      where: { id: consumerTenantId },
      select: { id: true, name: true, slug: true },
    });
    return toContractDto(contract, input.providerTenantId, partner ?? undefined);
  }

  async acceptContract(contractId: string, consumerTenantId: string): Promise<BilateralContractDto> {
    const enabled = await this.isEnabled(consumerTenantId);
    if (!enabled) throw new BilateralHttpError('Bilateral exchange disabled for consumer', 403);

    const contract = await prisma.bilateralExchangeContract.findUnique({
      where: { id: contractId },
      include: { schema: true },
    });
    if (!contract || contract.consumerTenantId !== consumerTenantId) {
      throw new BilateralHttpError('Contract not found', 404);
    }
    if (contract.status !== 'pending') throw new BilateralHttpError('Contract not pending', 400);
    if (!contract.consentProviderAt) throw new BilateralHttpError('Provider consent missing', 400);

    const updated = await prisma.bilateralExchangeContract.update({
      where: { id: contractId },
      data: {
        status: 'active',
        consentConsumerAt: new Date(),
      },
      include: { schema: true },
    });
    await this.audit(contractId, 'accept', consumerTenantId);
    const partner = await prisma.tenant.findUnique({
      where: { id: updated.providerTenantId },
      select: { id: true, name: true, slug: true },
    });
    return toContractDto(updated, consumerTenantId, partner ?? undefined);
  }

  async revokeContract(contractId: string, tenantId: string) {
    const contract = await prisma.bilateralExchangeContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new BilateralHttpError('Contract not found', 404);
    if (contract.providerTenantId !== tenantId && contract.consumerTenantId !== tenantId) {
      throw new BilateralHttpError('Not a party to this contract', 403);
    }

    await prisma.bilateralExchangeContract.update({
      where: { id: contractId },
      data: { status: 'revoked', revokedAt: new Date() },
    });
    await prisma.bilateralExchangePackage.updateMany({
      where: { contractId, deletedAt: null },
      data: { deletedAt: new Date() },
    });
    await this.audit(contractId, 'revoke', tenantId);
  }

  async listPackages(contractId: string, tenantId: string): Promise<BilateralPackageDto[]> {
    const contract = await prisma.bilateralExchangeContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new BilateralHttpError('Contract not found', 404);
    if (contract.providerTenantId !== tenantId && contract.consumerTenantId !== tenantId) {
      throw new BilateralHttpError('Not a party to this contract', 403);
    }

    const packages = await prisma.bilateralExchangePackage.findMany({
      where: { contractId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    return packages.map((pkg) => toPackageDto(pkg));
  }

  async listContractAudit(contractId: string, tenantId: string): Promise<BilateralAuditDto[]> {
    const contract = await prisma.bilateralExchangeContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new BilateralHttpError('Contract not found', 404);
    if (contract.providerTenantId !== tenantId && contract.consumerTenantId !== tenantId) {
      throw new BilateralHttpError('Not a party to this contract', 403);
    }

    const rows = await prisma.bilateralExchangeAudit.findMany({
      where: { contractId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return rows.map((row) => ({
      id: row.id,
      action: row.action,
      fieldHash: row.fieldHash,
      recordCount: row.recordCount,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async publishPackage(contractId: string, providerTenantId: string) {
    const contract = await this.requireActiveContract(contractId, providerTenantId, 'provider');
    const schema = await prisma.bilateralExchangeSchema.findUnique({
      where: { id: contract.schemaId },
    });
    if (!schema) throw new BilateralHttpError('Schema missing', 404);

    const allowedFields = Array.isArray(contract.allowedFields)
      ? (contract.allowedFields as string[])
      : [];
    const raw = await this.exportBuilder.buildForSchema(
      providerTenantId,
      schema.schemaKey,
      allowedFields
    );
    const filtered = this.safetyFilter.filterPayload(raw, allowedFields);
    if (filtered.rejected.length > 0) {
      throw new BilateralHttpError(`Payload rejected: ${filtered.rejected.join(', ')}`, 400);
    }

    const packageHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(filtered.accepted))
      .digest('hex');
    const expiresAt =
      contract.ttlExpiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const pkg = await prisma.bilateralExchangePackage.create({
      data: {
        contractId,
        payloadJson: filtered.accepted as Prisma.InputJsonValue,
        packageHash,
        expiresAt,
      },
    });
    await this.audit(contractId, 'publish', providerTenantId, allowedFields.length, packageHash);
    return toPackageDto(pkg);
  }

  async consumePackage(packageId: string, consumerTenantId: string) {
    const pkg = await prisma.bilateralExchangePackage.findUnique({
      where: { id: packageId },
      include: { contract: { include: { schema: true } } },
    });
    if (!pkg || pkg.deletedAt) throw new BilateralHttpError('Package not found', 404);
    if (pkg.contract.consumerTenantId !== consumerTenantId) {
      throw new BilateralHttpError('Not consumer', 403);
    }
    await this.requireActiveContract(pkg.contractId, consumerTenantId, 'consumer');
    if (pkg.expiresAt.getTime() < Date.now()) throw new BilateralHttpError('Package expired', 400);

    const payload = pkg.payloadJson as Record<string, unknown>;
    const allowedFields = Array.isArray(pkg.contract.allowedFields)
      ? (pkg.contract.allowedFields as string[])
      : [];
    const filtered = this.safetyFilter.filterPayload(payload, allowedFields);
    if (filtered.rejected.length > 0) {
      throw new BilateralHttpError('Package contains forbidden fields', 400);
    }

    await this.importAdapter.ingest(consumerTenantId, pkg.contractId, filtered.accepted);
    await this.audit(pkg.contractId, 'consume', consumerTenantId, allowedFields.length, pkg.packageHash);
    return { packageId: pkg.id, fields: Object.keys(filtered.accepted) };
  }

  async listAudit(contractId?: string) {
    return prisma.bilateralExchangeAudit.findMany({
      where: contractId ? { contractId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  private async requireActiveContract(
    contractId: string,
    tenantId: string,
    role: 'provider' | 'consumer'
  ) {
    const contract = await prisma.bilateralExchangeContract.findUnique({ where: { id: contractId } });
    if (!contract) throw new BilateralHttpError('Contract not found', 404);
    const partyId = role === 'provider' ? contract.providerTenantId : contract.consumerTenantId;
    if (partyId !== tenantId) throw new BilateralHttpError('Not authorized', 403);
    if (contract.status !== 'active') throw new BilateralHttpError('Contract not active', 400);
    if (!contract.consentProviderAt || !contract.consentConsumerAt) {
      throw new BilateralHttpError('Dual consent required', 400);
    }
    if (contract.revokedAt) throw new BilateralHttpError('Contract revoked', 400);
    if (contract.ttlExpiresAt && contract.ttlExpiresAt.getTime() < Date.now()) {
      throw new BilateralHttpError('Contract expired', 400);
    }
    return contract;
  }

  private async isEnabled(tenantId: string): Promise<boolean> {
    const settings = await getMerchantSettings(tenantId);
    return settings.brainBilateralExchangeEnabled === true;
  }

  private async audit(
    contractId: string,
    action: string,
    actorTenantId: string,
    recordCount?: number,
    fieldHash?: string
  ) {
    await prisma.bilateralExchangeAudit.create({
      data: { contractId, action, actorTenantId, recordCount: recordCount ?? null, fieldHash: fieldHash ?? null },
    });
  }
}
