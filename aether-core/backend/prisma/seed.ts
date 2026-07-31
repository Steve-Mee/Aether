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

  // Birth fixture category (tenant-unique slug) — usable for public/PDP + SiteProject slug tests.
  const ceramics = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'keramiek' } },
    update: { name: 'Keramiek' },
    create: {
      id: 'cat_keramiek_default',
      tenantId: tenant.id,
      name: 'Keramiek',
      slug: 'keramiek',
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
        {
          tenantId: tenant.id,
          name: 'Wireless Earbuds Pro',
          slug: 'wireless-earbuds-pro',
          description: 'Premium noise-cancelling wireless earbuds',
          price: 49.99,
          stock: 85,
          status: 'active',
        },
      ],
    });
  } else {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: 'wireless-earbuds-pro' } },
      update: {},
      create: {
        tenantId: tenant.id,
        name: 'Wireless Earbuds Pro',
        slug: 'wireless-earbuds-pro',
        description: 'Premium noise-cancelling wireless earbuds',
        price: 49.99,
        stock: 85,
        status: 'active',
      },
    });
  }

  // Birth e2e product (Appendix H brand Atelier Noord) — MediaAsset + ProductMedia join (no images Json).
  const PLACEHOLDER_MEDIA_URL = 'https://placehold.co/600x400';
  const komAarde = await prisma.product.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: 'kom-aarde' } },
    update: {
      name: 'Kom Aarde',
      status: 'active',
      categoryId: ceramics.id,
      seoTitle: 'Kom Aarde | Atelier Noord',
      seoDescription: 'Handmade keramieken kom — rustiek en lokaal.',
    },
    create: {
      id: 'prod_kom_aarde_default',
      tenantId: tenant.id,
      name: 'Kom Aarde',
      slug: 'kom-aarde',
      description: 'Handmade keramieken kom — rustiek. eerlijk. lokaal.',
      price: 38,
      stock: 12,
      status: 'active',
      categoryId: ceramics.id,
      seoTitle: 'Kom Aarde | Atelier Noord',
      seoDescription: 'Handmade keramieken kom — rustiek en lokaal.',
    },
  });

  const mediaAsset = await prisma.mediaAsset.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'products/kom-aarde/hero.jpg' } },
    update: {
      url: PLACEHOLDER_MEDIA_URL,
      mimeType: 'image/jpeg',
    },
    create: {
      id: 'media_kom_aarde_hero_default',
      tenantId: tenant.id,
      key: 'products/kom-aarde/hero.jpg',
      url: PLACEHOLDER_MEDIA_URL,
      mimeType: 'image/jpeg',
      metaJson: { width: 600, height: 400, source: 'seed' },
    },
  });

  const productMedia = await prisma.productMedia.upsert({
    where: {
      productId_mediaAssetId: { productId: komAarde.id, mediaAssetId: mediaAsset.id },
    },
    update: { sortOrder: 0, alt: 'Kom Aarde' },
    create: {
      id: 'pm_kom_aarde_hero_default',
      productId: komAarde.id,
      mediaAssetId: mediaAsset.id,
      sortOrder: 0,
      alt: 'Kom Aarde',
    },
  });

  if (process.env.SEED_SUPPLIER_DEMO === 'true') {
    const { seedSupplierDemo } = await import('./seed-supplier-demo');
    await seedSupplierDemo(prisma, tenant.id);
    console.log('Supplier demo seed applied');
  }

  console.log('Seed complete (P01 Birth fixtures):', {
    tenantId: tenant.id,
    categoryId: ceramics.id,
    categorySlug: 'keramiek',
    productId: komAarde.id,
    productSlug: 'kom-aarde',
    mediaAssetId: mediaAsset.id,
    productMediaId: productMedia.id,
    mediaUrl: PLACEHOLDER_MEDIA_URL,
    siteProjectSlugHint: 'atelier-noord',
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
