import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

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

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@aether.local' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@aether.local',
      role: 'admin',
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
