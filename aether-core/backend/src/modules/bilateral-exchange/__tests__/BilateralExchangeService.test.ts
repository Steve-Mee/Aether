import { BilateralExchangeService } from '../application/BilateralExchangeService';
import type { BilateralImportAdapter } from '../application/BilateralImportAdapter';

jest.mock('../../../shared/prisma/client', () => ({
  prisma: {
    bilateralExchangeSchema: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    bilateralExchangeContract: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    bilateralExchangePackage: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    bilateralExchangeAudit: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    tenant: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    product: { count: jest.fn().mockResolvedValue(20) },
    supplier: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

const getMerchantSettings = jest.fn().mockResolvedValue({ brainBilateralExchangeEnabled: true });

jest.mock('../../../shared/settings/TenantSettingsService', () => ({
  getMerchantSettings: (...args: unknown[]) => getMerchantSettings(...args),
}));

import { prisma } from '../../../shared/prisma/client';

describe('BilateralExchangeService', () => {
  const importAdapter = { ingest: jest.fn() } as unknown as BilateralImportAdapter;
  const service = new BilateralExchangeService(importAdapter);

  beforeEach(() => {
    jest.clearAllMocks();
    getMerchantSettings.mockResolvedValue({ brainBilateralExchangeEnabled: true });
  });

  it('proposes contract with slug resolution', async () => {
    (prisma.tenant.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 't-consumer' })
      .mockResolvedValueOnce({ id: 't-consumer', name: 'Partner', slug: 'partner-shop' });
    (prisma.bilateralExchangeSchema.findUnique as jest.Mock).mockResolvedValue({
      id: 'schema1',
      schemaKey: 'inventory_turnover_band',
      fields: ['product_count_band'],
      description: 'Inventory bands',
    });
    (prisma.bilateralExchangeContract.create as jest.Mock).mockResolvedValue({
      id: 'c1',
      status: 'pending',
      providerTenantId: 't-provider',
      consumerTenantId: 't-consumer',
      consentProviderAt: new Date('2026-01-01'),
      consentConsumerAt: null,
      revokedAt: null,
      ttlExpiresAt: null,
      allowedFields: ['product_count_band'],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      schema: {
        schemaKey: 'inventory_turnover_band',
        description: 'Inventory bands',
      },
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
    (prisma.tenant.findUnique as jest.Mock).mockResolvedValue({ id: 't-consumer' });
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
    (prisma.bilateralExchangeContract.findUnique as jest.Mock).mockResolvedValue({
      id: 'c1',
      consumerTenantId: 't-consumer',
      status: 'pending',
      consentProviderAt: null,
    });
    await expect(service.acceptContract('c1', 't-consumer')).rejects.toThrow('Provider consent missing');
  });

  it('rejects publish when contract not active', async () => {
    (prisma.bilateralExchangeContract.findUnique as jest.Mock).mockResolvedValue({
      id: 'c1',
      providerTenantId: 't-provider',
      status: 'pending',
      consentProviderAt: new Date(),
      consentConsumerAt: null,
      schemaId: 'schema1',
      allowedFields: ['product_count_band'],
    });
    await expect(service.publishPackage('c1', 't-provider')).rejects.toThrow('Contract not active');
  });

  it('lists packages for contract party only', async () => {
    (prisma.bilateralExchangeContract.findUnique as jest.Mock).mockResolvedValue({
      id: 'c1',
      providerTenantId: 't-provider',
      consumerTenantId: 't-consumer',
    });
    (prisma.bilateralExchangePackage.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'p1',
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
    (prisma.bilateralExchangeContract.findUnique as jest.Mock).mockResolvedValue({
      id: 'c1',
      providerTenantId: 't-provider',
      consumerTenantId: 't-consumer',
    });

    await expect(service.listPackages('c1', 't-other')).rejects.toThrow('Not a party to this contract');
  });
});
