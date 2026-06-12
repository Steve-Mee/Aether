import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { hashPassword } from '../src/shared/auth/passwordService';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const prisma = new PrismaClient();

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default' },
    update: {},
    create: {
      id: 'tenant_default',
      name: 'Default Merchant',
      slug: 'default',
    },
  });

  const apiKey = process.env.AETHER_API_KEY ?? 'dev-api-key-change-in-production';
  await prisma.apiKey.upsert({
    where: { keyHash: hashKey(apiKey) },
    update: {},
    create: {
      tenantId: tenant.id,
      keyHash: hashKey(apiKey),
      label: 'default-dev-key',
      role: 'admin',
    },
  });

  const seedPassword = process.env.AETHER_SEED_USER_PASSWORD ?? 'AetherDev2026!';
  const passwordHash = await hashPassword(seedPassword);

  const seedUsers = [
    { email: 'admin@aether.local', role: 'admin' },
    { email: 'ops@aether.local', role: 'operator' },
    { email: 'view@aether.local', role: 'viewer' },
  ] as const;

  for (const u of seedUsers) {
    await prisma.user.upsert({
      where: { tenantId_email: { tenantId: tenant.id, email: u.email } },
      update: { role: u.role, passwordHash },
      create: {
        tenantId: tenant.id,
        email: u.email,
        role: u.role,
        passwordHash,
      },
    });
  }

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      notificationPrefs: {
        autonomousLowRisk: { inApp: true, email: false },
        highRiskApproval: { inApp: true, email: true },
        supplierChanges: { inApp: true, email: false },
        weeklyDigest: { inApp: true, email: true },
        frequency: 'immediate',
      },
    },
  });

  const productCount = await prisma.product.count({ where: { tenantId: tenant.id } });
  if (productCount === 0) {
    await prisma.product.createMany({
      data: [
        {
          tenantId: tenant.id,
          name: 'Premium Hoodie',
          slug: 'premium-hoodie',
          description: 'Soft cotton hoodie',
          price: 89.99,
          stock: 42,
          status: 'active',
        },
        {
          tenantId: tenant.id,
          name: 'Classic Tee',
          slug: 'classic-tee',
          description: 'Everyday essential',
          price: 24.99,
          stock: 120,
          status: 'active',
        },
      ],
    });
  }

  if (process.env.SEED_SUPPLIER_DEMO === 'true') {
    const { seedSupplierDemo } = await import('./seed-supplier-demo');
    await seedSupplierDemo(prisma, tenant.id);
    console.log('Supplier demo seed applied');
  }

  console.log('Seed complete:', { tenantId: tenant.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
