import type { BilateralExchangeContract, BilateralExchangeSchema, Tenant } from '@prisma/client';

export type BilateralContractRole = 'provider' | 'consumer';

export interface BilateralContractDto {
  id: string;
  status: string;
  role: BilateralContractRole;
  providerTenantId: string;
  consumerTenantId: string;
  partnerTenantId: string;
  partnerName: string;
  partnerSlug: string;
  schemaKey: string;
  schemaDescription: string;
  allowedFields: string[];
  allowedFieldCount: number;
  ttlExpiresAt: string | null;
  consentProviderAt: string | null;
  consentConsumerAt: string | null;
  consentComplete: boolean;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BilateralPackageDto {
  id: string;
  packageHash: string;
  expiresAt: string;
  createdAt: string;
  fieldCount: number;
  expired: boolean;
}

export interface BilateralAuditDto {
  id: string;
  action: string;
  fieldHash: string | null;
  recordCount: number | null;
  createdAt: string;
}

type ContractWithSchema = BilateralExchangeContract & { schema: BilateralExchangeSchema };

export function toContractDto(
  contract: ContractWithSchema,
  viewerTenantId: string,
  partner?: Pick<Tenant, 'id' | 'name' | 'slug'>
): BilateralContractDto {
  const isProvider = contract.providerTenantId === viewerTenantId;
  const partnerTenantId = isProvider ? contract.consumerTenantId : contract.providerTenantId;

  const allowedFields = Array.isArray(contract.allowedFields)
    ? (contract.allowedFields as string[])
    : [];

  return {
    id: contract.id,
    status: contract.status,
    role: isProvider ? 'provider' : 'consumer',
    providerTenantId: contract.providerTenantId,
    consumerTenantId: contract.consumerTenantId,
    partnerTenantId,
    partnerName: partner?.name ?? partnerTenantId,
    partnerSlug: partner?.slug ?? '',
    schemaKey: contract.schema.schemaKey,
    schemaDescription: contract.schema.description,
    allowedFields,
    allowedFieldCount: allowedFields.length,
    ttlExpiresAt: contract.ttlExpiresAt?.toISOString() ?? null,
    consentProviderAt: contract.consentProviderAt?.toISOString() ?? null,
    consentConsumerAt: contract.consentConsumerAt?.toISOString() ?? null,
    consentComplete: Boolean(contract.consentProviderAt && contract.consentConsumerAt),
    revokedAt: contract.revokedAt?.toISOString() ?? null,
    createdAt: contract.createdAt.toISOString(),
    updatedAt: contract.updatedAt.toISOString(),
  };
}

export function toPackageDto(
  pkg: { id: string; packageHash: string; expiresAt: Date; createdAt: Date; payloadJson: unknown },
  now = Date.now()
): BilateralPackageDto {
  const payload = pkg.payloadJson as Record<string, unknown>;
  return {
    id: pkg.id,
    packageHash: pkg.packageHash,
    expiresAt: pkg.expiresAt.toISOString(),
    createdAt: pkg.createdAt.toISOString(),
    fieldCount: Object.keys(payload).length,
    expired: pkg.expiresAt.getTime() < now,
  };
}
