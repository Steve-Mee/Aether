export interface BilateralSchemaRecord {
  id: string;
  schemaKey: string;
  fields: unknown;
  description: string;
}

export interface BilateralTenantSummary {
  id: string;
  name: string;
  slug: string;
}

export interface BilateralContractRecord {
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
  schema: BilateralSchemaRecord;
}

export interface BilateralPackageRecord {
  id: string;
  contractId: string;
  payloadJson: unknown;
  packageHash: string;
  expiresAt: Date;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface BilateralPackageWithContract extends BilateralPackageRecord {
  contract: BilateralContractRecord;
}

export interface BilateralAuditRecord {
  id: string;
  contractId: string;
  action: string;
  actorTenantId: string | null;
  recordCount: number | null;
  fieldHash: string | null;
  createdAt: Date;
}

export interface CreateContractInput {
  providerTenantId: string;
  consumerTenantId: string;
  schemaId: string;
  allowedFields: string[];
  ttlExpiresAt: Date | null;
}

export interface CreatePackageInput {
  contractId: string;
  payloadJson: unknown;
  packageHash: string;
  expiresAt: Date;
}

export interface BilateralExchangeRepository {
  listSchemas(): Promise<BilateralSchemaRecord[]>;
  findSchemaByKey(schemaKey: string): Promise<BilateralSchemaRecord | null>;
  findSchemaById(schemaId: string): Promise<BilateralSchemaRecord | null>;
  findTenantBySlug(slug: string): Promise<{ id: string } | null>;
  findTenantById(id: string): Promise<BilateralTenantSummary | null>;
  findTenantsByIds(ids: string[]): Promise<BilateralTenantSummary[]>;
  listContractsForTenant(tenantId: string): Promise<BilateralContractRecord[]>;
  findContractById(contractId: string): Promise<BilateralContractRecord | null>;
  createContract(input: CreateContractInput): Promise<BilateralContractRecord>;
  updateContractAccepted(contractId: string): Promise<BilateralContractRecord>;
  revokeContract(contractId: string): Promise<void>;
  softDeletePackagesForContract(contractId: string): Promise<void>;
  listPackagesForContract(contractId: string): Promise<BilateralPackageRecord[]>;
  findPackageById(packageId: string): Promise<BilateralPackageWithContract | null>;
  createPackage(input: CreatePackageInput): Promise<BilateralPackageRecord>;
  listAuditForContract(contractId: string, take?: number): Promise<BilateralAuditRecord[]>;
  listAudit(contractId?: string, take?: number): Promise<BilateralAuditRecord[]>;
  createAudit(input: {
    contractId: string;
    action: string;
    actorTenantId: string;
    recordCount?: number | null;
    fieldHash?: string | null;
  }): Promise<void>;
}
