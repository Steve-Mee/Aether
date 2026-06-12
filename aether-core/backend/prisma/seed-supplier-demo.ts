/**
 * Demo suppliers for staging / SEED_SUPPLIER_DEMO=true.
 * stock_change rows are seed-only; live scraper does not detect stock yet.
 */
import { PrismaClient } from '@prisma/client';

const DEMO_SUPPLIERS = [
  {
    id: 'sup_demo_nordic',
    name: 'Nordic Supply Co.',
    website: 'https://nordic-supply.example',
    supplierType: 'wholesale',
    status: 'active',
    autoSyncEnabled: true,
    products: [
      { sku: 'NS-1001', name: 'Camping Kettle 1L', price: 24.5, stock: 120 },
      { sku: 'NS-2040', name: 'Trek Pole Set', price: 49.0, stock: 45 },
    ],
    changes: [
      {
        changeType: 'price_change',
        payload: { sku: 'NS-1001', name: 'Camping Kettle 1L', oldPrice: 26.2, newPrice: 24.5 },
      },
    ],
  },
  {
    id: 'sup_demo_greenline',
    name: 'GreenLine Wholesale',
    website: 'https://greenline.example',
    supplierType: 'wholesale',
    status: 'active',
    autoSyncEnabled: true,
    products: [
      { sku: 'GL-550', name: 'Eco Lunch Box', price: 12.9, stock: 200 },
    ],
    changes: [],
  },
  {
    id: 'sup_demo_atlas',
    name: 'Atlas Home BV',
    website: 'https://atlas-home.example',
    supplierType: 'manufacturer',
    status: 'active',
    autoSyncEnabled: false,
    products: [
      { sku: 'AH-88', name: 'Linen Throw', price: 34.0, stock: 18 },
    ],
    changes: [
      {
        changeType: 'stock_change',
        payload: { sku: 'AH-88', name: 'Linen Throw', oldStock: 42, newStock: 18 },
      },
    ],
  },
  {
    id: 'sup_demo_primetools',
    name: 'PrimeTools Europe',
    website: 'https://primetools.example',
    supplierType: 'distributor',
    status: 'disabled',
    autoSyncEnabled: false,
    products: [],
    changes: [],
  },
  {
    id: 'sup_demo_berg',
    name: 'Berg & Berg Textiles',
    website: 'https://berg-textiles.example',
    supplierType: 'manufacturer',
    status: 'active',
    autoSyncEnabled: true,
    products: [
      { sku: 'BB-12', name: 'Merino Scarf', price: 28.0, stock: 60 },
      { sku: 'BB-13', name: 'Wool Blanket', price: 89.0, stock: 12 },
    ],
    changes: [
      {
        changeType: 'price_change',
        payload: { sku: 'BB-12', name: 'Merino Scarf', oldPrice: 31.5, newPrice: 28.0 },
      },
    ],
  },
  {
    id: 'sup_demo_solarmax',
    name: 'SolarMax Components',
    website: 'https://solarmax.example',
    supplierType: 'wholesale',
    status: 'active',
    autoSyncEnabled: true,
    products: [
      { sku: 'SM-01', name: 'Panel 120W', price: 145.0, stock: 8 },
    ],
    changes: [],
  },
  {
    id: 'sup_demo_kitchenpro',
    name: 'KitchenPro Direct',
    website: 'https://kitchenpro.example',
    supplierType: 'distributor',
    status: 'active',
    autoSyncEnabled: true,
    products: [
      { sku: 'KP-A1', name: 'Chef Knife 20cm', price: 39.5, stock: 75 },
      { sku: 'KP-A2', name: 'Cutting Board Oak', price: 22.0, stock: 90 },
      { sku: 'KP-B3', name: 'Spice Mill', price: 14.5, stock: 110 },
    ],
    changes: [],
  },
  {
    id: 'sup_demo_urban',
    name: 'Urban Goods BV',
    website: 'https://urban-goods.example',
    supplierType: 'wholesale',
    status: 'inactive',
    autoSyncEnabled: false,
    products: [{ sku: 'UG-1', name: 'City Backpack', price: 55.0, stock: 0 }],
    changes: [],
  },
] as const;

export async function seedSupplierDemo(prisma: PrismaClient, tenantId: string): Promise<void> {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 3);

  for (const demo of DEMO_SUPPLIERS) {
    await prisma.supplier.upsert({
      where: { id: demo.id },
      update: {
        name: demo.name,
        website: demo.website,
        supplierType: demo.supplierType,
        status: demo.status,
        autoSyncEnabled: demo.autoSyncEnabled,
      },
      create: {
        id: demo.id,
        tenantId,
        name: demo.name,
        website: demo.website,
        supplierType: demo.supplierType,
        status: demo.status,
        autoSyncEnabled: demo.autoSyncEnabled,
      },
    });

    for (const p of demo.products) {
      await prisma.supplierProduct.upsert({
        where: { supplierId_sku: { supplierId: demo.id, sku: p.sku } },
        update: {
          name: p.name,
          currentPrice: p.price,
          stock: p.stock,
          lastUpdated: weekAgo,
        },
        create: {
          supplierId: demo.id,
          name: p.name,
          sku: p.sku,
          currentPrice: p.price,
          stock: p.stock,
          lastUpdated: weekAgo,
        },
      });
    }

    await prisma.supplierChange.deleteMany({
      where: { tenantId, supplierId: demo.id },
    });

    for (const c of demo.changes) {
      await prisma.supplierChange.create({
        data: {
          tenantId,
          supplierId: demo.id,
          changeType: c.changeType,
          payload: JSON.stringify(c.payload),
          status: 'pending',
          createdAt: weekAgo,
        },
      });
    }
  }
}
