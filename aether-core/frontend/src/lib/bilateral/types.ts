export type BilateralContractRole = 'provider' | 'consumer';

export interface BilateralSchemaDto {
  id: string;
  schemaKey: string;
  fields: string[];
  description: string;
}

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

export interface ProposeBilateralContractInput {
  consumerTenantSlug: string;
  schemaKey: string;
  allowedFields: string[];
  ttlExpiresAt?: string;
}

export function displayContractStatus(contract: BilateralContractDto): string {
  if (contract.status === 'revoked' || contract.revokedAt) return 'revoked';
  if (contract.ttlExpiresAt && new Date(contract.ttlExpiresAt).getTime() < Date.now()) return 'expired';
  return contract.status;
}
