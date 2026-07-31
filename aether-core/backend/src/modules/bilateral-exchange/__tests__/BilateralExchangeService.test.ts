import { BilateralExchangeService } from '../application/BilateralExchangeService';
import { BilateralExportBuilder } from '../application/BilateralExportBuilder';
import type { BilateralImportAdapter } from '../application/BilateralImportAdapter';
import type { BilateralExchangeRepository } from '../application/ports/BilateralExchangeRepository';
import type { BilateralExportDataPort } from '../application/ports/BilateralExportDataPort';

const getMerchantSettings = jest.fn().mockResolvedValue({ brainBilateralExchangeEnabled: true });

jest.mock('../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: (...args: unknown[]) => getMerchantSettings(...args),
}));

function createMockRepository(): jest.Mocked<BilateralExchangeRepository> {
  return {
    listSchemas: jest.fn(),
    findSchemaByKey: jest.fn(),
    findSchemaById: jest.fn(),
    findTenantBySlug: jest.fn(),
    findTenantById: jest.fn(),
    findTenantsByIds: jest.fn(),
    listContractsForTenant: jest.fn(),
    findContractById: jest.fn(),
    createContract: jest.fn(),
    updateContractAccepted: jest.fn(),
    revokeContract: jest.fn(),
    softDeletePackagesForContract: jest.fn(),
    listPackagesForContract: jest.fn(),
    findPackageById: jest.fn(),
    createPackage: jest.fn(),
    listAuditForContract: jest.fn(),
    listAudit: jest.fn(),
    createAudit: jest.fn(),
  };
}

function createMockExportData(): jest.Mocked<BilateralExportDataPort> {
  return {
    countProducts: jest.fn().mockResolvedValue(20),
    countLowStockProducts: jest.fn().mockResolvedValue(2),
    findSupplierTypes: jest.fn().mockResolvedValue([]),
  };
}

describe('BilateralExchangeService', () => {
  const importAdapter = { ingest: jest.fn() } as unknown as BilateralImportAdapter;
  const repository = createMockRepository();
  const exportBuilder = new BilateralExportBuilder(createMockExportData());
  const service = new BilateralExchangeService(importAdapter, repository, exportBuilder);

  beforeEach(() => {
    jest.clearAllMocks();
    getMerchantSettings.mockResolvedValue({ brainBilateralExchangeEnabled: true });
  });

  it('proposes contract with slug resolution', async () => {
    repository.findTenantBySlug.mockResolvedValue({ id: 't-consumer' });
    repository.findSchemaByKey.mockResolvedValue({
      id: 'schema1',
      schemaKey: 'inventory_turnover_band',
      fields: ['product_count_band'],
      description: 'Inventory bands',
    });
    repository.createContract.mockResolvedValue({
      id: 'c1',
      status: 'pending',
      providerTenantId: 't-provider',
      consumerTenantId: 't-consumer',
      schemaId: 'schema1',
      consentProviderAt: new Date('2026-01-01'),
      consentConsumerAt: null,
      revokedAt: null,
      ttlExpiresAt: null,
      allowedFields: ['product_count_band'],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      schema: {
        id: 'schema1',
        schemaKey: 'inventory_turnover_band',
        fields: ['product_count_band'],
        description: 'Inventory bands',
      },
    });
    repository.findTenantById.mockResolvedValue({
      id: 't-consumer',
      name: 'Partner',
      slug: 'partner-shop',
    });

    const contract = await service.proposeContract({
      providerTenantId: 't-provider',
      consumerTenantSlug: 'partner-shop',
      schemaKey: 'inventory_turnover_band',
      allowedFields: ['product_count_band'],
    });

    expect(contract.status).toBe('pending');
    expect(contract.partnerSlug).toBe('partner-shop');
    expect(contract.role).toBe('provider');
  });

  it('rejects propose when partner bilateral disabled', async () => {
    getMerchantSettings
      .mockResolvedValueOnce({ brainBilateralExchangeEnabled: true })
      .mockResolvedValueOnce({ brainBilateralExchangeEnabled: false });

    await expect(
      service.proposeContract({
        providerTenantId: 't-provider',
        consumerTenantId: 't-consumer',
        schemaKey: 'inventory_turnover_band',
        allowedFields: ['product_count_band'],
      })
    ).rejects.toThrow('Bilateral exchange disabled for partner');
  });

  it('rejects self-contract', async () => {
    await expect(
      service.proposeContract({
        providerTenantId: 't-provider',
        consumerTenantId: 't-provider',
        schemaKey: 'inventory_turnover_band',
        allowedFields: ['product_count_band'],
      })
    ).rejects.toThrow('Cannot propose contract with self');
  });

  it('rejects accept without provider consent', async () => {
    repository.findContractById.mockResolvedValue({
      id: 'c1',
      consumerTenantId: 't-consumer',
      providerTenantId: 't-provider',
      schemaId: 'schema1',
      status: 'pending',
      consentProviderAt: null,
      consentConsumerAt: null,
      revokedAt: null,
      ttlExpiresAt: null,
      allowedFields: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      schema: {
        id: 'schema1',
        schemaKey: 'inventory_turnover_band',
        fields: [],
        description: '',
      },
    });
    await expect(service.acceptContract('c1', 't-consumer')).rejects.toThrow('Provider consent missing');
  });

  it('rejects publish when contract not active', async () => {
    repository.findContractById.mockResolvedValue({
      id: 'c1',
      providerTenantId: 't-provider',
      consumerTenantId: 't-consumer',
      schemaId: 'schema1',
      status: 'pending',
      consentProviderAt: new Date(),
      consentConsumerAt: null,
      revokedAt: null,
      ttlExpiresAt: null,
      allowedFields: ['product_count_band'],
      createdAt: new Date(),
      updatedAt: new Date(),
      schema: {
        id: 'schema1',
        schemaKey: 'inventory_turnover_band',
        fields: [],
        description: '',
      },
    });
    await expect(service.publishPackage('c1', 't-provider')).rejects.toThrow('Contract not active');
  });

  it('lists packages for contract party only', async () => {
    repository.findContractById.mockResolvedValue({
      id: 'c1',
      providerTenantId: 't-provider',
      consumerTenantId: 't-consumer',
      schemaId: 'schema1',
      status: 'active',
      consentProviderAt: new Date(),
      consentConsumerAt: new Date(),
      revokedAt: null,
      ttlExpiresAt: null,
      allowedFields: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      schema: {
        id: 'schema1',
        schemaKey: 'inventory_turnover_band',
        fields: [],
        description: '',
      },
    });
    repository.listPackagesForContract.mockResolvedValue([
      {
        id: 'p1',
        contractId: 'c1',
        packageHash: 'abc',
        expiresAt: new Date('2027-01-01'),
        createdAt: new Date('2026-01-01'),
        payloadJson: { product_count_band: '10-49' },
        deletedAt: null,
      },
    ]);

    const packages = await service.listPackages('c1', 't-consumer');
    expect(packages).toHaveLength(1);
    expect(packages[0].fieldCount).toBe(1);
    expect(packages[0].packageHash).toBe('abc');
  });

  it('rejects listPackages for non-party', async () => {
    repository.findContractById.mockResolvedValue({
      id: 'c1',
      providerTenantId: 't-provider',
      consumerTenantId: 't-consumer',
      schemaId: 'schema1',
      status: 'active',
      consentProviderAt: new Date(),
      consentConsumerAt: new Date(),
      revokedAt: null,
      ttlExpiresAt: null,
      allowedFields: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      schema: {
        id: 'schema1',
        schemaKey: 'inventory_turnover_band',
        fields: [],
        description: '',
      },
    });

    await expect(service.listPackages('c1', 't-other')).rejects.toThrow('Not a party to this contract');
  });
});
