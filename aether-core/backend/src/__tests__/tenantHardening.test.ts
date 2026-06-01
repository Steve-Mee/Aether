import * as fs from 'fs';
import * as path from 'path';
import { requireTenantId, MissingTenantError } from '../shared/tenant/tenantContext';
import { PrismaInventoryRepository } from '../modules/inventory-pricing/infrastructure/persistence/PrismaInventoryRepository';
import { prisma } from '../shared/prisma/client';

jest.mock('../shared/prisma/client', () => ({
  prisma: {
    inventoryItem: {
      upsert: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
    product: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    auditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

describe('tenantContext', () => {
  it('throws MissingTenantError when tenantId is empty', () => {
    expect(() => requireTenantId('', 'test')).toThrow(MissingTenantError);
    expect(() => requireTenantId(null, 'test')).toThrow(MissingTenantError);
  });

  it('returns tenantId when valid', () => {
    expect(requireTenantId('tenant_abc', 'test')).toBe('tenant_abc');
  });
});

describe('PrismaInventoryRepository tenant enforcement', () => {
  const repo = new PrismaInventoryRepository(prisma as any);

  it('requires tenantId on updateInventory', async () => {
    await expect(repo.updateInventory('', 'p1', 'wh1', 10)).rejects.toThrow(MissingTenantError);
  });

  it('passes tenantId to prisma on updateInventory', async () => {
    await repo.updateInventory('tenant_abc', 'p1', 'wh1', 10);
    expect(prisma.inventoryItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId_productId_warehouseId: { tenantId: 'tenant_abc', productId: 'p1', warehouseId: 'wh1' } },
      })
    );
  });
});

describe('persistence tenant guard', () => {
  const MODULES_ROOT = path.resolve(__dirname, '../modules');

  function listPersistenceFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) results.push(...listPersistenceFiles(full));
      else if (
        entry.name.endsWith('.ts') &&
        full.includes(`${path.sep}infrastructure${path.sep}persistence${path.sep}`)
      ) {
        results.push(full);
      }
    }
    return results;
  }

  it('no tenant_default in infrastructure persistence', () => {
    const violations: string[] = [];
    for (const file of listPersistenceFiles(MODULES_ROOT)) {
      const content = fs.readFileSync(file, 'utf8');
      if (/tenant_default/.test(content)) {
        violations.push(path.relative(MODULES_ROOT, file));
      }
    }
    expect(violations).toEqual([]);
  });
});
